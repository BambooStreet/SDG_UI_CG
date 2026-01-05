from enum import Enum, auto # Enum(열거형) 기능 가져오기

class GameState(Enum):
    """
    게임의 현재 상태를 나타내는 열거형
    auto(): 파이썬이 알아서 고유한 값을 할당해줌
    """
    READY = auto() # 게임 시작 전 플레이어 모집 중
    DESCRIPTION = auto() # 제시어 설명 단계
    DISCUSSION = auto() # 토론 단계
    VOTING = auto() # 투표 단계
    FINAL_GUESS = auto() # 라이어가 최종 정답을 추측하는 단계
    ENDED = auto() # 모든 게임이 종료된 상태
    
class Role(Enum):
    """
    플레이어의 역할을 나타내는 열거형
    """
    CITIZEN = auto() # 시민 (제시어를 알고 있음)
    LIAR = auto() # 라이어 (제시어를 모름)


