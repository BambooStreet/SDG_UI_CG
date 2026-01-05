# backend/serialize.py
from typing import Any, Dict, List, Optional

def _enum_name(x):
    return getattr(x, "name", x)

def serialize_game(game) -> dict:
    players = {}
    for name, p in game.players.items():
        players[name] = {
            "name": p.name,
            "is_ai": bool(getattr(p, "is_ai", False)),
            "role": _enum_name(getattr(p, "role", None)),
            "has_described": bool(getattr(p, "has_described", False)),
            "has_voted": bool(getattr(p, "has_voted", False)),
            "votes_received": int(getattr(p, "votes_received", 0)),
            "is_fool": bool(getattr(p, "is_fool", False)),
        }

    return {
        "game_state": _enum_name(game.game_state),
        "category": game.category,
        "keyword": game.keyword,
        "turn_order": [p.name for p in game.turn_order],
        "turn_index": int(game.turn_index),
        "liar": getattr(getattr(game, "liar", None), "name", None),
        "fool_player": getattr(getattr(game, "fool_player", None), "name", None),
        "suspect": getattr(getattr(game, "suspect", None), "name", None),
        "winner": _enum_name(getattr(game, "winner", None)),
        "descriptions": dict(getattr(game, "descriptions", {}) or {}),
        "discussions": list(getattr(game, "discussions", []) or []),
        "human_suspect_name": getattr(game, "human_suspect_name", None),
        "current_round": int(getattr(game, "current_round", 1)),
        "players": players,
    }

def deserialize_game(state: dict, GameSession, Player, AIPlayer, GameState, Role):
    g = GameSession()
    g.category = state.get("category")
    g.keyword = state.get("keyword")
    g.turn_index = int(state.get("turn_index", 0))
    g.descriptions = state.get("descriptions", {}) or {}
    g.discussions = state.get("discussions", []) or []
    g.human_suspect_name = state.get("human_suspect_name")
    g.current_round = int(state.get("current_round", 1))

    # game_state 복원
    gs = state.get("game_state")
    if gs and hasattr(GameState, gs):
        g.game_state = getattr(GameState, gs)

    # players 복원
    g.players = {}
    for name, pdata in (state.get("players") or {}).items():
        is_ai = bool(pdata.get("is_ai", False))
        p = AIPlayer(name) if is_ai else Player(name)

        role = pdata.get("role")
        if role and hasattr(Role, role):
            p.role = getattr(Role, role)

        p.has_described = bool(pdata.get("has_described", False))
        p.has_voted = bool(pdata.get("has_voted", False))
        p.votes_received = int(pdata.get("votes_received", 0))
        if pdata.get("is_fool"):
            setattr(p, "is_fool", True)

        g.players[name] = p

    # turn_order 복원
    order = state.get("turn_order") or []
    g.turn_order = [g.players[n] for n in order if n in g.players]

    liar = state.get("liar")
    g.liar = g.players.get(liar) if liar else None

    fool = state.get("fool_player")
    g.fool_player = g.players.get(fool) if fool else None

    suspect = state.get("suspect")
    g.suspect = g.players.get(suspect) if suspect else None

    winner = state.get("winner")
    if winner and hasattr(Role, winner):
        g.winner = getattr(Role, winner)

    return g

def present_for_player(game, me_name: str, Role) -> dict:
    me = game.players.get(me_name)
    my_role = getattr(me, "role", None)
    keyword_for_me = game.keyword if my_role == Role.CITIZEN else "???"

    return {
        "phase": _enum_name(game.game_state),
        "publicState": {
            "round": int(getattr(game, "current_round", 1)),
            "topic": game.category,
            "players": [{"name": p.name, "is_ai": bool(getattr(p, "is_ai", False))} for p in game.players.values()],
            "turn": {
                "order": [p.name for p in game.turn_order],
                "index": int(game.turn_index),
                "currentPlayer": game.turn_order[game.turn_index].name if game.turn_order else None,
            },
        },
        "privateState": {
            "myName": me_name,
            "role": _enum_name(my_role),
            "keyword": keyword_for_me,
        },
    }
