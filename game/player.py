from .constants import Role

class Player:
    """
    게임 참가자 한 명의 정보를 저장하는 클래스
    """
    def __init__(self, name:str):
        self.name: str = name # 플레이어 이름
        self.role: Role | None = None # 플레이어 역할
        self.is_ai: bool = False # 기본값은 사람(False)

        # 게임 라운드마다 초기화되어야 하는 상태 값
        self.has_described: bool = False # 이번 라운드에 설명을 했는지
        self.has_voted: bool = False # 이번 라운드에 투표를 했는지
        self.votes_received: int = 0 # 이번 라운드에 받은 득표 수

    def __repr__(self) -> str:
        """
        객체를 print()로 출력할 떄 "Player(이름, 역할)"
        형태로 보이게 해준다. 디버깅에 유용
        """
        return f"Player(name={self.name}, role={self.role.name if self.role else 'Not assigned'})"
    
    def prepare_for_new_round(self):
        """
        새로운 라운드 시작 전에
        플레이어의 상태를 초기화한다.
        """
        self.has_described = False
        self.has_voted = False
        self.votes_received = 0


