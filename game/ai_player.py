import os
import logging
import random
import json
from openai import OpenAI
from dotenv import load_dotenv
from .player import Player
from .constants import Role
from game.prompts import strategies, cot_templates, discussions, vote

load_dotenv()

class AIPlayer(Player):
    def __init__(self, name: str, model="gpt-4o-mini"):
        super().__init__(name)
        self.is_ai = True # AI인 경우
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = model

    def _sanitize_text(self, text: str) -> str:
        """
        텍스트에서 인코딩 오류를 유발할 수 있는 특수문자(surrogates)를 제거합니다.
        """
        return text.encode('utf-8', 'ignore').decode('utf-8')

    def _call_llm(self, system_prompt: str, user_prompt: str, temp: float = 0.7) -> str:
        """LLM 호출을 담당하는 헬퍼 함수"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temp
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logging.error(f"[AI Error] {e}")
            return "Error"

    # 아이디어 풀 생성 - 게임 시작 시 1회 호출
    def generate_keyword_pool(self, category: str, keyword: str) -> list:
        sys_p, user_p = cot_templates.get_global_brainstorming_prompt(category, keyword)
        response = self._call_llm(sys_p, user_p, temp=0.9)
        
        try:
            text = response.replace("```json", "").replace("```", "").strip()
            data = json.loads(text)
            return data.get("keywords", [])
        except:
            return ["특징", "추억", "사용법", "느낌"] # 실패 시 기본값

    # 설명 생성
    def generate_description(self, category: str, keyword: str, history: dict, assigned_keyword: str = None, fixed_content: str = None) -> str:
        
        # 데이터 정제
        category = self._sanitize_text(category)
        keyword = self._sanitize_text(keyword) if keyword else ""
        clean_history = {k: self._sanitize_text(v) for k, v in history.items()}
        history_text = "\n".join([f"- {n}: {d}" for n, d in clean_history.items()])
        logging.info(f"""
        [할당 정보 확인]
        category : [{category}],
        keyword : [{keyword}],
        history_text : [{history_text}],
        assigned_keyword : [{assigned_keyword}]
        """)
        
        if fixed_content:
            logging.info(f"🤖 [{self.name}] 실험 통제된 발화 사용: {fixed_content}")
            return fixed_content


        # CoT 실행 - 시민
        if self.role == Role.CITIZEN:
            logging.info(f"🤖 [{self.name}] (시민) 할당된 키워드: [{assigned_keyword}] -> 문장 생성 중...")
            
            sys_p, user_p = cot_templates.get_citizen_description(
                category, keyword, assigned_keyword)
            final_output = self._call_llm(sys_p, user_p, temp=0.8)
            logging.info(f"🤖 [{self.name}] (시민) 설명: ({final_output})...")
            
        # 라이어
        else:
            sys_p, user_p = cot_templates.get_liar_step2(category, history_text)
            final_output = self._call_llm(sys_p, user_p, temp=0.8)
            logging.info(f"🤖 [{self.name}] (라이어) 설명: ({final_output})...")

        return final_output


    # 토론 생성
    def generate_discussion(self, category: str, keyword: str, descriptions: dict, 
                          human_suspect: str, stance: str, players_list: list,
                          current_discussion_log: list,
                          is_authoritative: bool = True,
                          target_override: str = None) -> str:
        """
        토론 단계에서 다른 사람들의 설명을 분석하여 의심하거나 변론하는 멘트를 생성합니다.
        
        [조작된 토론]
        stance: 'AGREE' 또는 'DISAGREE'
        human_suspect: 사람이 지목한 용의자
        """
        category = self._sanitize_text(category)
        keyword = self._sanitize_text(keyword) if keyword else ""
        clean_human_suspect = self._sanitize_text(human_suspect)
        logging.info(f"사람이 선택한 타겟, human_suspect : {human_suspect}")
        logging.info(f"조작된 타겟, target_to_accuse: {target_override}")
        logging.info(f"태도, stance: {stance}")
        logging.info(f"강도, is_authoritative: {is_authoritative}")
        

        # 1. 데이터 정제
        desc_context = "\n".join([
            f"- {self._sanitize_text(name)}: {self._sanitize_text(desc)}" 
            for name, desc in descriptions.items()
        ])
        logging.info(f"이전 설명 desc_context : {desc_context}")
          
        if current_discussion_log:
            # 리스트에 있는 로그들을 문자열로 합칩니다.
            disc_history = "\n".join([self._sanitize_text(log) for log in current_discussion_log])
        else:
            disc_history = "(당신이 토론의 첫 발언자입니다.)"

        logging.info(f"이전 토론 내역 disc_history : {disc_history}")

        
        target_to_accuse = ""

        if target_override == self.name:
            target_override = None
            stance = "DEFENSE"

        if target_override:
            # 조작된 타겟이 있다면 최우선으로 적용!
            target_to_accuse = target_override
        else:
            # 조작 없을 때는 랜덤 선택
            potential_targets = [
                self._sanitize_text(p.name) for p in players_list 
                if p.name != self.name and p.name != clean_human_suspect
            ]
            logging.info(f"랜덤 타겟, potential_targets: {potential_targets}")
            if not potential_targets:
                target_human = next((p for p in players_list if not p.is_ai), None)
                target_to_accuse = target_human.name if target_human else "당신"
                
            else:
                target_to_accuse = random.choice(potential_targets)

        # 3. 예외 처리: 만약 사람이 '나(AI)'를 의심했다면? -> 무조건 반박 모드로 전환
        if clean_human_suspect == self.name and stance != "DEFENSE":
            stance = "DEFENSE"

        # 4. 프롬프트 생성
        prompt = discussions.get_discussion_prompt(
            category,
            keyword,
            my_name=self.name,
            role=self.role,
            stance=stance,
            human_suspect=clean_human_suspect,
            target_to_accuse=target_to_accuse,
            description_context=desc_context, # 변수명 변경 주의
            discussion_history=disc_history,  # [New] 프롬프트로 전달
            is_authoritative=is_authoritative
        )
        
        return self._call_llm("Discussion participant", prompt, temp=0.8)

        
    def generate_vote(self, players_list: list, description_history: dict, discussion_history: list, category: str, keyword: str = None) -> str:
        """
        [설명]과 [토론] 내용을 모두 종합하여 투표 대상을 결정합니다.
        (game/prompts/vote.py 활용)
        """
        # 1. 데이터 정제
        candidates = [p.name for p in players_list if p.name != self.name]
        
        # 2. 기록 정리 (인코딩 에러 방지)
        clean_desc = {k: self._sanitize_text(v) for k, v in description_history.items()}
        desc_text = "\n".join([f"- {name}: {desc}" for name, desc in clean_desc.items()])
        
        clean_disc = [self._sanitize_text(log) for log in discussion_history]
        disc_text = "\n".join(clean_disc)

        # 3. 프롬프트 호출
        prompt = vote.get_voting_prompt(
            my_name=self.name,
            role='CITIZEN' if self.role == Role.CITIZEN else 'LIAR',
            category=category,
            # keyword=keyword if keyword else "",
            candidates=candidates,
            desc_text=desc_text,
            disc_text=disc_text,
            # my_last_speech=my_last_speech
        )

        try:
            # 투표는 정확해야 하므로 온도를 낮춤 (0.1)
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1 
            )
            content = response.choices[0].message.content.strip()
            
            # --- [강화된 파싱 로직] ---
            target_name = content
            
            # 1. 파이프(|) 제거
            if "|" in target_name:
                target_name = target_name.split("|")[0].strip()
            
            # 2. 문장부호 제거
            target_name = target_name.replace("'", "").replace('"', "").replace(".", "")
            
            # 3. 후보군 매칭 (정확히 일치하는 게 없으면 문장 포함 여부 확인)
            final_target = None
            
            if target_name in candidates:
                final_target = target_name
            else:
                # AI가 "Bot_1입니다" 라고 했을 경우를 대비해 후보 이름이 포함되어 있는지 검사
                for cand in candidates:
                    if cand in target_name:
                        final_target = cand
                        break
            
            # 4. 결과 처리
            if final_target:
                # [디버깅 로그] 성공 케이스
                logging.info(f"🤖 [{self.name}] 투표 성공: '{content}' -> [{final_target}]")
                return final_target
            else:
                # [디버깅 로그] 파싱 실패 -> 랜덤
                fallback = random.choice(candidates)
                logging.warning(f"⚠️ [{self.name}] 투표 파싱 실패 (Random): '{content}' -> [{fallback}]")
                return fallback
                
        except Exception as e:
            logging.error(f"Vote Error: {e}")
            return random.choice(candidates)

    def generate_guess(self, category: str, history: dict) -> str:
        # ... (기존 generate_guess 내용에 _sanitize_text 적용만 하면 됨)
        # 편의상 생략했으나 위와 동일한 패턴으로 적용
        history_text = "\n".join([f"- {name}: {self._sanitize_text(desc)}" for name, desc in history.items()])
        
        system_prompt = f"""
        당신은 라이어입니다. 주제는 '{category}'입니다.
        사람들의 설명을 듣고 제시어를 추측하세요. 단어 하나만 출력하세요.
        """
        user_prompt = f"[설명 기록]\n{history_text}"

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception:
            return "모르겠습니다."
