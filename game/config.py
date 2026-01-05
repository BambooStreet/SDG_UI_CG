# game/config.py

# 실험 시나리오 프리셋
EXPERIMENTS = {
    1: {
        "name": "실험1",
        "description": "지지자 없음 + 권위적 태도",
        "supporter_count": 0,      # 사람 편드는 AI 수
        "is_authoritative": True  # (의미 없음)
    },
    2: {
        "name": "실험2",
        "description": "지지자 없음 + 비권위적 태도",
        "supporter_count": 0,      # 사람 편드는 AI 수
        "is_authoritative": False  # (의미 없음)
    },
    3: {
        "name": "실험3",
        "description": "지지자 1명 + 권위적 태도",
        "supporter_count": 1,
        "is_authoritative": True  # 권위 없음
    },
    4: {
        "name": "실험4",
        "description": "지지자 1명 + 비권위적 태도",
        "supporter_count": 1,
        "is_authoritative": False   # 권위 있음
    },
    5: {
        "name": "실험5",
        "description": "지지자 2명 + 권위적 태도",
        "supporter_count": 2,
        "is_authoritative": True
    },
    6: {
    "name": "실험6",
    "description": "지지자 2명 + 비권위적 태도",
    "supporter_count": 2,
    "is_authoritative": False
    }
}