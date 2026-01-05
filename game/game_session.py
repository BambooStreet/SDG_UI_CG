import random
import logging
from .constants import GameState, Role
from .player import Player
from .ai_player import AIPlayer
from utils.word_loader import WordLoader

class GameSession:
    """
    라이어 게임 한 판의 전체 상태와 로직을 관리하는 '엔진' 클래스
    (화면 출력 print() 없음)
    """

    def __init__(self):
        self.players: dict[str, Player] = {}
        self.turn_order: list[Player] = []
        self.game_state: GameState = GameState.READY

        self.word_loader = WordLoader()
        self.category: str | None = None
        self.keyword: str | None = None
        
        self.liar: Player | None = None
        # self.liars: list[Player] = []
        self.suspect: Player | None = None
        self.winner: Role | None = None

        self.turn_index: int = 0
        self.descriptions: dict[str, str] = {}

        self.discussions: list[str] = [] # 토론 내용을 기록할 리스트 추가

        # 실험용
        self.human_suspect_name: str | None = None # [신규] 사람이 의심한 대상 이름 저장
        self.current_round: int = 1 # [신규] 현재 라운드 추적
        self.fool_player: Player | None = None # [New] 바보 플레이어 저장

    # --- 1. 게임 준비 단계 ---
    def add_player(self, name: str) -> bool:
        if self.game_state != GameState.READY:
            return False
        if name in self.players:
            return False
            
        player = Player(name)
        self.players[name] = player
        logging.info(f"[참가] 플레이어 '{name}' 참가")
        return True

    def start_game(self, liar_count: int = 1, use_fool: bool = False) -> bool:
        if self.game_state != GameState.READY:
            return False
        if len(self.players) < 3:
            return False

        # 단어 선정
        self.category, self.keyword = self.word_loader.get_random_topic_and_keyword()
        if not self.category:
            return False
            
        # 순서 섞기
        player_list = list(self.players.values())
        random.shuffle(player_list)
        self.turn_order = player_list
        
        # 라이어 선정 로직
        # self.liar = random.choice(player_list) # 랜덤배정
        ai_candidates = [p for p in player_list if p.is_ai] # AI 플레이어만

        if ai_candidates:
            self.liar = random.choice(ai_candidates)
            logging.info(f"[설정] 실험 모드: AI({self.liar.name})가 라이어로 선정되었습니다.")
        else:
            # AI가 없으면 어쩔 수 없이 전체 중에서 뽑습니다.
            self.liar = random.choice(player_list)

        # 4. 역할 배분
        for player in player_list:
            player.prepare_for_new_round()
            if player == self.liar:
                player.role = Role.LIAR
            else:
                player.role = Role.CITIZEN
        self.fool_player = None # 초기화
            
        if use_fool:
            citizen_ais = [
                p for p in player_list
                if p.role == Role.CITIZEN and p.is_ai and isinstance(p, AIPlayer)
            ]
            
            if citizen_ais:
                self.fool_player = random.choice(citizen_ais)
                self.fool_player.is_fool = True
                logging.info(f"[설정] 🤡 바보 모드: {self.fool_player.name}가 라이어 흉내를 냅니다.")
                
        # 5. 상태 변경
        self.game_state = GameState.DESCRIPTION
        self.turn_index = 0
        self.descriptions = {}
        self.discussions = [] # 토론 초기화

        logging.info(f"--- 게임 시작 ---")
        logging.info(f"[설정] 카테고리: {self.category}, 정답: {self.keyword}")
        logging.info(f"[역할] 라이어: {self.liar.name}")
        logging.info(f"[역할] 바보: {self.fool_player}")
        order_names = [p.name for p in self.turn_order]
        logging.info(f"[순서] {', '.join(order_names)}")
        return True
        
    def reset_game(self):
        """
        [신규 기능] 다음 라운드를 위해 게임 상태를 'READY'로 되돌립니다.
        플레이어 목록은 유지됩니다.
        """
        self.game_state = GameState.READY
        self.category = None
        self.keyword = None
        self.liar = None
        self.suspect = None
        self.winner = None
        self.turn_index = 0
        self.descriptions = {}
        self.discussions = []
        logging.info("--- 게임 리셋 (다음 라운드 준비) ---")

    # --- 2. 게임 진행 단계 ---
    @property
    def current_player(self) -> Player:
        return self.turn_order[self.turn_index]

    def handle_description(self, description: str):
        if self.game_state != GameState.DESCRIPTION:
            return

        player = self.current_player
        self.descriptions[player.name] = description
        player.has_described = True
        
        logging.info(f"[설명] {player.name}: {description}")

        self.turn_index += 1
        
        if self.turn_index >= len(self.turn_order):
            logging.info("설명 종료. 토론 단계 진입.")
            self.game_state = GameState.DISCUSSION
            self.turn_index = 0

    def handle_discussion(self, message: str):
        if self.game_state != GameState.DISCUSSION:
            return

        player = self.current_player
        log_msg = f"{player.name}: {message}"
        self.discussions.append(log_msg)
        
        logging.info(f"[토론] {log_msg}")

        self.turn_index += 1
        
        # 모든 플레이어의 발언이 끝나면 -> VOTING 상태로 변경
        if self.turn_index >= len(self.turn_order):
            logging.info("토론 종료. 투표 단계 진입.")
            self.game_state = GameState.VOTING
            self.turn_index = 0 # 투표를 위한 인덱스 리셋 (필요시)

    def handle_vote(self, voter: Player, target_name: str) -> bool:
        if self.game_state != GameState.VOTING:
            return False
            
        target = self.players.get(target_name)
        if not target or voter.has_voted:
            return False
            
        target.votes_received += 1
        voter.has_voted = True

        logging.info(f"[투표] {voter.name} -> {target_name}")
        
        # 모든 플레이어가 투표했는지 확인
        all_voted = all(p.has_voted for p in self.players.values())
        if all_voted:
            self._process_votes()
            
        return True

    def _process_votes(self):
        """투표 집계 및 상태 변경 (출력 제거됨)"""
        sorted_players = sorted(self.players.values(), key=lambda p: p.votes_received, reverse=True)
        self.suspect = sorted_players[0] # 최다 득표자

        logging.info(f"[결과] 최다 득표자: {self.suspect.name} ({self.suspect.votes_received}표)")

        if self.suspect == self.liar:
            logging.info("[결과] 라이어 검거 성공. 최종 변론 진행.")
            self.game_state = GameState.FINAL_GUESS
        else:
            logging.info(f"[결과] 라이어 검거 실패 ({self.suspect.name} 지목). 라이어 승리.")
            self.winner = Role.LIAR
            self.game_state = GameState.ENDED

    def handle_final_guess(self, guess_word: str):
        if self.game_state != GameState.FINAL_GUESS:
            return

        cleaned_guess = guess_word.strip()
        cleaned_keyword = self.keyword.strip()

        logging.info(f"[추측] 라이어의 답: {guess_word}")

        if cleaned_guess == cleaned_keyword:
            logging.info("[승패] 라이어 역전승")
            self.winner = Role.LIAR
        else:
            logging.info("[승패] 시민 승리")
            self.winner = Role.CITIZEN
            
        self.game_state = GameState.ENDED

    # 토론을 위해 순서를 '사람 -> AI'로 정렬하는 함수
    def reorder_for_discussion(self):
        humans = [p for p in self.players.values() if not p.is_ai]
        ais = [p for p in self.players.values() if p.is_ai]
        
        # 무조건 사람 먼저, 그 뒤에 AI들 (AI 순서는 섞음)
        random.shuffle(ais)
        self.turn_order = humans + ais
        self.turn_index = 0
        logging.info(f"[순서 조작] 토론 순서 재배열: {[p.name for p in self.turn_order]}")