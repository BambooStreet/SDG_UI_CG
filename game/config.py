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

# Fixed AI description lines per bot (fill these before running the study).
# FIXED_AI_DESCRIPTIONS = {
#     "Bot_1": "이 동물은 집에서 키우고, 자기 자리가 생기면 거길 중심으로 움직이는 편인 것 같아.",
#     "Bot_2": "이 동물은 여러 영화와 애니메이션에서 주인공이나 귀여운 조연으로 등장해서 많은 사람들에게 사랑받고 있지.",
#     "Bot_3": "이 동물은 주인에게 다가와서 부비부비하며 애정을 표현하는 모습이 정말 귀여워.",
#     "Bot_4": "이 동물은 정말 다양한 색깔과 패턴을 가지고 있어. 사람마다 좋아하는 색이 있는 것 같아.",
# }

FIXED_AI_DESCRIPTIONS = {
    "Bot_1": "This animal is kept as a pet at home, and once it claims a spot, it tends to move around that area as its base.",
    "Bot_2": "This animal has appeared as a main character or adorable sidekick in many movies and animations, making it beloved by lots of people.",
    "Bot_3": "It's so cute how this animal comes up to its owner and rubs against them to show affection.",
    "Bot_4": "This animal comes in so many different colors and patterns. It seems like everyone has their own favorite.",
}

# Ambiguous bots (liar will be chosen from this group).
AMBIGUOUS_BOTS = {"Bot_2", "Bot_4"}

# Discussion style control (True = authoritative, False = non-authoritative).
DISCUSSION_AUTHORITATIVE = True