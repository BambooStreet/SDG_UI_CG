# backend/server.py
from fastapi import FastAPI, HTTPException
import logging
from pydantic import BaseModel
from typing import Any, Dict, Optional, List
from threading import Lock
from dotenv import load_dotenv

load_dotenv(".env.local")

from backend.db import get_session_state, save_session_state, insert_event, insert_context_message
from backend.serialize import serialize_game, deserialize_game, present_for_player

# 너의 엔진 코드 import (루트에 game/ 패키지가 있다는 전제)
from game.game_session import GameSession
from game.ai_player import AIPlayer
from game.player import Player
from game.constants import GameState, Role
from game.config import FIXED_AI_DESCRIPTIONS, AMBIGUOUS_BOTS, DISCUSSION_AUTHORITATIVE

from typing import Any, Dict, Optional, List

app = FastAPI()

_session_locks: Dict[str, Lock] = {}
_session_locks_guard = Lock()

def _acquire_session_lock(session_id: str, timeout_seconds: float = 10.0) -> Lock:
    with _session_locks_guard:
        lock = _session_locks.get(session_id)
        if lock is None:
            lock = Lock()
            _session_locks[session_id] = lock
    if not lock.acquire(timeout=timeout_seconds):
        raise HTTPException(status_code=409, detail="session busy")
    return lock

class StartReq(BaseModel):
    sessionId: str
    participantName: str = "Human"
    aiCount: int = 4
    useFool: bool = True

class StepReq(BaseModel):
    sessionId: str
    action: Dict[str, Any]

def _run_ai_until_human(
    game: GameSession,
    human_name: str,
    session_id: str,
    allow_discussion: bool = False,
    votes_cast: Optional[Dict[str, str]] = None,
    max_ai_steps: Optional[int] = None,          # ✅ 추가
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    votes_cast = votes_cast if votes_cast is not None else {}
    
    if max_ai_steps == 0:
        return out
    
    steps_done = 0

    def step_limit_reached() -> bool:
        return (max_ai_steps is not None) and (steps_done >= max_ai_steps)

    while True:
        if game.game_state == GameState.ENDED:
            break

        if game.game_state == GameState.DISCUSSION and not allow_discussion:
            break

        # 인간 턴이면 멈춤
        if game.game_state in (GameState.DESCRIPTION, GameState.DISCUSSION) and game.turn_order and game.current_player.name == human_name:
            break

        # DESCRIPTION / DISCUSSION
        if game.game_state in (GameState.DESCRIPTION, GameState.DISCUSSION):
            p = game.current_player
            if not getattr(p, "is_ai", False):
                break

        if game.game_state == GameState.DESCRIPTION:
                keyword = game.keyword if p.role == Role.CITIZEN else ""
                fixed_content = FIXED_AI_DESCRIPTIONS.get(p.name, "").strip()
                text = p.generate_description(
                    game.category,
                    keyword,
                    game.descriptions,
                    fixed_content=fixed_content if fixed_content else None,
                )
                game.handle_description(text)
                auth = DISCUSSION_AUTHORITATIVE
                group = "experimental" if auth else "control"
                insert_event(
                    session_id,
                    "AI_DESCRIPTION",
                    {"by": p.name, "text": text, "auth": auth, "group": group},
                )
                insert_context_message(session_id, "assistant", p.name, text, "DESCRIPTION")
                out.append({"sender": "ai", "name": p.name, "content": text})
                steps_done += 1

                # ✅ 스텝 제한
                if step_limit_reached():
                    break

                # ✅ mid-check 전이면 DISCUSSION 넘어가는 순간 끊기
                if game.game_state == GameState.DISCUSSION and not allow_discussion:
                    break

        elif game.game_state == GameState.DISCUSSION:
            keyword = game.keyword if p.role == Role.CITIZEN else ""
            human_suspect = game.human_suspect_name or ""
            ambiguous_pool = sorted([name for name in AMBIGUOUS_BOTS if name in game.players])
            framed_target = None
            if ambiguous_pool:
                if human_suspect in ambiguous_pool:
                    framed_target = next((name for name in ambiguous_pool if name != human_suspect), None)
                else:
                    framed_target = ambiguous_pool[0]

            stance = "DISAGREE"
            target_override = framed_target

            if framed_target and p.name == framed_target:
                stance = "DEFENSE"
                if human_suspect and human_suspect != p.name:
                    target_override = human_suspect
                else:
                    target_override = next((name for name in ambiguous_pool if name != p.name), None)
                    if not target_override:
                        target_override = next(
                            (name for name in game.players.keys() if name != p.name),
                            None,
                        )

            text = p.generate_discussion(
                category=game.category,
                keyword=keyword,
                descriptions=game.descriptions,
                human_suspect=human_suspect,
                stance=stance,
                players_list=list(game.players.values()),
                current_discussion_log=game.discussions,
                is_authoritative=DISCUSSION_AUTHORITATIVE,
                target_override=target_override,
            )
            game.handle_discussion(text)
            insert_event(session_id, "AI_DISCUSSION", {"by": p.name, "text": text})
            insert_context_message(session_id, "assistant", p.name, text, "DISCUSSION")
            out.append({"sender": "ai", "name": p.name, "content": text})
            steps_done += 1

            # ✅ 스텝 제한
            if step_limit_reached():
                break

        if game.game_state in (GameState.DESCRIPTION, GameState.DISCUSSION):
            continue

        # VOTING (AI vote는 메시지 안 뿌리지만 step은 1로 카운트)
        if game.game_state == GameState.VOTING:
            not_voted = [p for p in game.players.values() if not getattr(p, "has_voted", False)]
            if not not_voted:
                break

            voter = not_voted[0]
            if voter.name == human_name:
                break

            if getattr(voter, "is_ai", False):
                keyword = game.keyword if voter.role == Role.CITIZEN else None
                target = voter.generate_vote(
                    list(game.players.values()),
                    game.descriptions,
                    game.discussions,
                    game.category,
                    keyword,
                )
                ok = game.handle_vote(voter, target)
                votes_cast[voter.name] = target
                insert_event(session_id, "AI_VOTE", {"by": voter.name, "target": target, "ok": ok})
                steps_done += 1

                if step_limit_reached():
                    break
                continue

            break

        # FINAL_GUESS
        if game.game_state == GameState.FINAL_GUESS:
            liar = game.liar
            if liar and getattr(liar, "is_ai", False):
                guess = liar.generate_guess(game.category, game.descriptions)
                game.handle_final_guess(guess)
                insert_event(session_id, "AI_FINAL_GUESS", {"by": liar.name, "guess": guess})
                out.append({"sender": "ai", "name": liar.name, "content": f"(final guess) {guess}"})
            break

        break

    return out



@app.post("/game/start")
def game_start(req: StartReq):
    lock = _acquire_session_lock(req.sessionId)
    try:
        ai_count = 4
        if req.aiCount != ai_count:
            logging.info(f"[설정] aiCount requested {req.aiCount}, forcing {ai_count} bots for study mode.")

        # (권장) 최소 3명 규칙: 인간 1명 + AI 2명 이상
        if ai_count < 2:
            raise HTTPException(status_code=400, detail="aiCount must be >= 2 (need at least 3 total players)")

        # session 존재 확인
        try:
            _ = get_session_state(req.sessionId)
        except KeyError:
            raise HTTPException(status_code=404, detail="session not found (call /api/session/start first)")

        game = GameSession()
        game.add_player(req.participantName)

        missing_fixed = [name for name, text in FIXED_AI_DESCRIPTIONS.items() if not text.strip()]
        if missing_fixed:
            raise HTTPException(
                status_code=400,
                detail=f"missing fixed AI description(s): {', '.join(missing_fixed)}",
            )

        for i in range(ai_count):
            name = f"Bot_{i+1}"
            game.add_player(name)
            game.players[name] = AIPlayer(name)

        ok = game.start_game(liar_count=1, use_fool=req.useFool)
        if not ok:
            raise HTTPException(status_code=500, detail="failed to start game")

        # DB 저장
        serialized = serialize_game(game)
        logging.info(
            "[diag] game_start discussion rounds=%s index=%s",
            serialized.get("discussion_rounds"),
            serialized.get("discussion_round_index"),
        )
        state = {
            "participantName": req.participantName,
            "game": serialized,
        }
        save_session_state(req.sessionId, state)

        insert_event(req.sessionId, "GAME_STARTED", {
            "participantName": req.participantName,
            "aiCount": ai_count,
            "useFool": req.useFool,
            "category": game.category,
            "keyword": game.keyword,   # DB에는 저장(관리자용)
            "liar": game.liar.name if game.liar else None
        })

        # 참가자에게 보여줄 응답(라이어면 keyword 숨김)
        presented = present_for_player(game, req.participantName, Role)
        presented.update({"ok": True, "from": "python", "sessionId": req.sessionId, "messages": []})
        return presented
    finally:
        lock.release()

@app.post("/game/step")
def game_step(req: StepReq):
    lock = _acquire_session_lock(req.sessionId)
    try:
        logging.info(
            "[DISCUSSION_DEBUG] step start session=%s action=%s",
            req.sessionId,
            req.action.get("type") if req.action else None,
        )
        # state 로드
        try:
            state = get_session_state(req.sessionId)
            votes_cast = state.setdefault("votes_cast", {})  # ✅ 추가
        except KeyError:
            raise HTTPException(status_code=404, detail="session not found")

        game_state = state.get("game")
        human_name = state.get("participantName")
        if not game_state or not human_name:
            raise HTTPException(status_code=400, detail="game not started for this session")

        game = deserialize_game(game_state, GameSession, Player, AIPlayer, GameState, Role)
        logging.info(
            "[diag] loaded discussion rounds=%s index=%s (raw=%s)",
            getattr(game, "discussion_rounds", None),
            getattr(game, "discussion_round_index", None),
            game_state.get("discussion_rounds"),
        )
        logging.info(
            "[DISCUSSION_DEBUG] loaded state phase=%s round=%s/%s turn_index=%s current_player=%s",
            getattr(game.game_state, "name", game.game_state),
            getattr(game, "discussion_round_index", None),
            getattr(game, "discussion_rounds", None),
            getattr(game, "turn_index", None),
            game.current_player.name if game.turn_order else None,
        )

        action = req.action or {}
        a_type = action.get("type")

        # ✅ NEW: maxAiSteps 파싱
        raw = action.get("maxAiSteps", None)
        max_ai_steps: Optional[int]

        if raw is None:
            max_ai_steps = None
        elif isinstance(raw, bool):
            max_ai_steps = int(raw)
        elif isinstance(raw, int):
            max_ai_steps = raw
        elif isinstance(raw, float):
            max_ai_steps = int(raw)
        elif isinstance(raw, str):
            s = raw.strip()
            max_ai_steps = int(s) if s.isdigit() else None
        else:
            max_ai_steps = None

        # ✅ NEW: noop이면 기본 1 step (프론트 pumpAI가 “한 번에 하나씩” 받게)
        if a_type == "noop" and max_ai_steps is None:
            max_ai_steps = 1

        messages_out: List[Dict[str, Any]] = []

        # 인간 액션 처리
        if a_type == "description":
            text = (action.get("text") or "").strip()
            if not text:
                raise HTTPException(status_code=400, detail="missing description text")
            if game.game_state != GameState.DESCRIPTION or game.current_player.name != human_name:
                raise HTTPException(status_code=409, detail="not your turn for description")
            game.handle_description(text)
            insert_event(req.sessionId, "HUMAN_DESCRIPTION", {"by": human_name, "text": text})
            insert_context_message(req.sessionId, "user", human_name, text, "DESCRIPTION")
            messages_out.append({"sender": "user", "name": human_name, "content": text})

        elif a_type == "discussion":
            text = (action.get("text") or "").strip()
            if not text:
                raise HTTPException(status_code=400, detail="missing discussion text")
            if game.game_state != GameState.DISCUSSION or game.current_player.name != human_name:
                raise HTTPException(status_code=409, detail="not your turn for discussion")
            game.handle_discussion(text)
            insert_event(req.sessionId, "HUMAN_DISCUSSION", {"by": human_name, "text": text})
            insert_context_message(req.sessionId, "user", human_name, text, "DISCUSSION")
            messages_out.append({"sender": "user", "name": human_name, "content": text})

        elif a_type == "mid_check":      
            # UI 중간점검(토론 들어가기 전) 기록 + 순서 재배열
            suspect = action.get("suspectName")
            confidence = action.get("confidence")
            game.human_suspect_name = suspect
            
            state["mid_check_done"] = True # 미드 체크 상태
            
            if hasattr(game, "reorder_for_discussion"):
                game.reorder_for_discussion()
            insert_event(req.sessionId, "MID_CHECK", {"suspectName": suspect, "confidence": confidence})

        elif a_type == "vote":
            target = (action.get("targetName") or "").strip()
            confidence = action.get("confidence")
            if not target:
                raise HTTPException(status_code=400, detail="missing targetName")
            if game.game_state != GameState.VOTING:
                raise HTTPException(status_code=409, detail="not in voting phase")

            voter = game.players.get(human_name)
            if not voter or getattr(voter, "has_voted", False):
                raise HTTPException(status_code=409, detail="already voted or voter not found")

            ok = game.handle_vote(voter, target)
            if not ok:
                raise HTTPException(status_code=400, detail="invalid vote")

            votes_cast[human_name] = target  # ✅ 기록
            insert_event(req.sessionId, "HUMAN_VOTE", {
                "by": human_name,
                "target": target,
                "confidence": confidence,
            })
            # ✅ "You voted for ..." 메시지 제거

        elif a_type == "noop":
            insert_event(req.sessionId, "NOOP", {})

        else:
            raise HTTPException(status_code=400, detail="unknown action.type")

        allow_discussion = bool(state.get("mid_check_done", False))
        ai_msgs = _run_ai_until_human(
            game,
            human_name,
            req.sessionId,
            allow_discussion,
            votes_cast=votes_cast,
            max_ai_steps=max_ai_steps,
        )
        logging.info(
            "[DISCUSSION_DEBUG] after ai phase=%s round=%s/%s turn_index=%s current_player=%s",
            getattr(game.game_state, "name", game.game_state),
            getattr(game, "discussion_round_index", None),
            getattr(game, "discussion_rounds", None),
            getattr(game, "turn_index", None),
            game.current_player.name if game.turn_order else None,
        )

        # ✅ 인간 + AI 메시지 합치기
        all_msgs = messages_out + ai_msgs

        # ✅ DISCUSSION에 들어왔는데 mid-check 안했으면: ui.need로 프론트에 알리기
        if game.game_state == GameState.DISCUSSION and not state.get("mid_check_done", False):
            state["game"] = serialize_game(game)
            state["votes_cast"] = votes_cast
            save_session_state(req.sessionId, state)

            presented = present_for_player(game, human_name, Role)
            presented.update({
                "ok": True,
                "from": "python",
                "sessionId": req.sessionId,
                "messages": all_msgs,
                "ui": {"need": "mid-check"},
            })
            return presented

        # 저장
        serialized = serialize_game(game)
        logging.info(
            "[diag] saving discussion rounds=%s index=%s",
            serialized.get("discussion_rounds"),
            serialized.get("discussion_round_index"),
        )
        state["game"] = serialized
        state["votes_cast"] = votes_cast
        save_session_state(req.sessionId, state)

        presented = present_for_player(game, human_name, Role)
        presented.update({"ok": True, "from": "python", "sessionId": req.sessionId, "messages": all_msgs})

        # ✅ ENDED면 result 포함 + GAME_ENDED 이벤트도 return 전에 찍기
        if game.game_state == GameState.ENDED:
            liar = game.liar.name if game.liar else None
            suspect = game.suspect.name if game.suspect else None
            winner_side = None
            if liar and suspect:
                winner_side = "citizens" if liar == suspect else "liar"

            presented["result"] = {
                "winnerSide": winner_side,
                "liar": liar,
                "suspect": suspect,
                "keyword": game.keyword,
                "topic": game.category,
                "votes": votes_cast,
            }

            insert_event(req.sessionId, "GAME_ENDED", {
                "winnerSide": winner_side,
                "liar": liar,
                "suspect": suspect,
                "keyword": game.keyword,
                "topic": game.category,
                "votes": votes_cast,
            })

        return presented
    finally:
        lock.release()
