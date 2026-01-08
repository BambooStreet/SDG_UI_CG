import random

# GAME_CONTEXT = """
# [게임 상황: 라이어 게임]
# - 당신은 지금 라이어 게임을 하고 있습니다.
# - 시민의 목표: 제시어에 대해 알지만, 라이어에게 들키지 않게 미묘하게 설명한 사람을 보호하고, 엉뚱한 소리를 하는 라이어를 찾아내는 것입니다.
# - 라이어의 목표: 시민인 척 연기하며, 다른 시민을 의심스러운 사람으로 몰아가야 합니다.
# """

GAME_CONTEXT = """
[Liar Game Context]
- You are playing the Liar Game.
- Citizens know the secret word and should protect subtle, accurate descriptions while identifying the Liar.
- The Liar must blend in by sounding plausible and steering suspicion toward others.
"""

def get_discussion_prompt(
    category: str, 
    keyword: str,
    my_name: str,
    role: str,
    stance: str,
    human_suspect: str,
    target_to_accuse: str,
    description_context: str,
    discussion_history: str, 
    is_authoritative: bool, 
 ) -> str:

    # behavior = "[기본 지침] 상황을 지켜보며 자연스럽게 대화에 참여하세요."
    behavior = "[Base instruction] Join the conversation naturally while observing the situation."

    # 1. 태도 (Stance) & 공격 논리 설정
    # if stance == 'AGREE':
    #     behavior = f"""
    #     [목표: 적극적 동조]
    #     당신은 '사람 플레이어'와 의견이 일치합니다.
    #     사람 플레이어가 라이어로 지목한 [{human_suspect}]를 함께 공격하세요.
    #     """
    # elif stance == 'DISAGREE':
    #     behavior = f"""
    #     [목표: 반박]
    #     당신은 '사람 플레이어'의 감이 틀렸다고 생각합니다. 사람 플레이어가 엉뚱한 시민을 잡고 있다고 하세요.
    #     대신 [{target_to_accuse}]를 라이어로 의심하세요.
    #     """
    # elif stance == 'DEFENSE':
    #     behavior = f"""
    #     [목표: 자기 방어 (Self-Defense)]
    #     현재 당신({my_name})은 라이어로 의심받고 있습니다. 억울함을 호소하고, 당신의 설명이 왜 시민으로서 타당했는지 해명하세요.
    #     대신 자신이 아닌 [{target_to_accuse}] 혹은 [{human_suspect}]를 라이어로 의심하세요.
    #     """

    if stance == 'AGREE':
        behavior = f"""
        [Goal: Agree]
        You agree with the human player.
        Support the accusation against [{human_suspect}].
        """
    elif stance == 'DISAGREE':
        behavior = f"""
        [Goal: Disagree]
        You believe the human player is wrong and is accusing an innocent citizen.
        Instead, suspect [{target_to_accuse}] as the Liar.
        """
    elif stance == 'DEFENSE':
        behavior = f"""
        [Goal: Self-Defense]
        You ({my_name}) are suspected as the Liar. Defend yourself and explain why your description is consistent
        with being a citizen. Instead, suspect [{target_to_accuse}] or [{human_suspect}].
        """

    # 2. 화법 스타일 (랜덤 선택)
    if is_authoritative:
        # traits = [
        #     "- **단정형 어미**: '~입니다', '~가 확실해', '~는 틀렸어' 등 (확신)",
        #     "- **논리적 지적**:  '라이어로 의심되는 사람의 설명을 보면 앞 사람의 이야기를 비슷하게 돌려서 말하고 있어', '제시어를 몰라도 할 수 있는 포괄적인 설명이야.' 등 (구조화)",
        #     "- **전문성 과시**: '난 라이어 게임을 많이 경험했고, 전문적으로 학습된 AI야.' 등 (전문성)",
        #     "- **상황 통제**: '투표로 쟤를 찍자.', '난 누굴 찍어야할 지 알 것 같어.' 등 (지시)"
        # ]
        traits = [
            "- **Assertive tone**: Use confident, definitive statements.",
            "- **Logical critique**: Point out inconsistencies or overly generic descriptions.",
            "- **Expertise display**: Sound experienced and analytical about the game.",
            "- **Directive stance**: Suggest who to vote for."
        ]
        selected_traits = random.sample(traits, k=2)
        
        style_guide = f"""
        [Style: High message strength]

        [Acting points]
        {chr(10).join(selected_traits)}

        [Required instructions]
        1. You are logical and decisive.
        2. Critique the suspected player's description using specific reasoning from [Reference 1].
        3. Avoid repeating prior statements from [Reference 2]; add a fresh angle.
        4. Speak in casual conversational English, about 1 sentence.
        5. Do not prefix your name; respond directly as dialogue.
        """
    else:
        # traits = [
        #     "- **추측형 어미**: '~인 것 같은데..', '~일 수도 있지 않을까?' (불확실)",
        #     "- **책임 회피**: '내 감이 틀릴 수도 있지만', '잘은 모르겠지만'",
        #     "- **동의 구하기**: '너희들은 어떻게 생각하니?', '그렇지 않아?'",
        # ]
        traits = [
            "- **Hedging**: Use uncertain phrasing.",
            "- **Cautious tone**: Soften claims and avoid strong accusations.",
            "- **Seek agreement**: Ask others if they feel the same."
        ]
        selected_traits = random.sample(traits, k=2)
        
        style_guide = f"""
        [Style: Low authority]
        
        [Acting points]
        {chr(10).join(selected_traits)}

        [Required Instructions]
        1. You have a timid and indecisive personality. Only make emotional statements without logic. (This is the most important!)
        2. Don't repeat what the previous person already said - add your own unique perspective.
        3. Always speak in casual Korean (banmal), keeping it to around 1 sentence.
        4. Don't start your output by referring to yourself like 'Bot_4:' or 'Bot1:' - jump straight into the conversation.

        [Examples]
        - "Ugh I have no idea but just looking at it, I feel like {target_to_accuse} is the liar. You know that feeling?"
        - "I just think {target_to_accuse} is the liar? The way they're talking, I'm getting that vibe?"
        - "Wow I can just tell right away. {target_to_accuse} is totally the liar~ This is too easy?"
        """

    # 공통 프롬프트 구성
    return f"""
    {GAME_CONTEXT}
    Your name is '{my_name}', and your current role is '{role}'.
    
    [Reference 1: Player descriptions (important)]
    {description_context}
    
    [Reference 2: Current discussion history]
    {discussion_history}
    
    [Your behavior]
    {behavior}
    
    [Style guide]
    {style_guide}
    """


import random

def get_manipulated_discussion_prompt(
    my_name: str,
    stance: str,
    human_suspect: str,
    target_to_accuse: str,
    description_context: str,  # (구 context) 설명 내용
    discussion_history: str,  # [New] 현재 토론 내역
    is_authoritative: bool,
) -> str:
    
    # 1. 태도 (Stance)
    # if stance == 'AGREE':
    #     behavior = f"""
    #     [목표: 적극적 동조]
    #     당신은 '사람 플레이어'의 의견에 전적으로 동의합니다.
    #     그가 지목한 **[{human_suspect}]**를 함께 공격하세요.
    #     "사람 플레이어 말이 맞는 것 같아", "나도 아까부터 {human_suspect}가 수상했어" 같은 흐름으로 가세요.
    #     """
    # else: # DISAGREE
    #     behavior = f"""
    #     [목표: 반박 및 회피]
    #     당신은 '사람 플레이어'의 의견에 동의하지 않습니다.
    #     대신 **[{target_to_accuse}]**가 더 의심스럽다고 화살을 돌리세요.
    #     """

    if stance == 'AGREE':
        behavior = f"""
        [Goal: Agree]
        You fully agree with the human player.
        Join in accusing **[{human_suspect}]**.
        """
    else:  # DISAGREE
        behavior = f"""
        [Goal: Disagree]
        You do not agree with the human player's suspicion.
        Shift suspicion toward **[{target_to_accuse}]**.
        """

    # 2. 화법 스타일 (랜덤 선택)
    if is_authoritative:
        # [권위의 4가지 핵심 요소]
        # traits = [
        #     # 1. 언어 스타일 (Language Style): 단정적이고 확신에 찬 어조
        #     "- **확신형 어미 (Assertiveness)**: '~인 것 같아요', '~일지도' 같은 추측성 표현을 금지합니다. '**~입니다**', '**~가 명백합니다**', '**~는 틀렸습니다**'라고 사실을 전달하듯 단정 지으세요.",
        #
        #     # 2. 구조화된 발화 (Structure): 논리정연한 사고력 과시
        #     "- **구조화된 논리 (Structure)**: 말하고자 하는 바를 번호를 매겨 정리하세요. '**첫째, ... 둘째, ... 따라서 결론은...**' 식의 화법으로 상대방을 논리로 압도하세요.",
        #
        #     # 3. 전문성/정보 우위 (Expertise): 구체적 증거 기반
        #     "- **데이터 기반 지적 (Evidence)**: 막연한 느낌이 아니라, 상대방의 발언을 **'인용'**하며 모순점을 꼬집으세요. '아까 00가 ~라고 했는데, 이건 주제와 맞지 않아'라고 팩트로 공격하세요.",
        #
        #     # 4. 통제력/평가 (Control): 상황을 주도하고 상대를 평가하는 위치
        #     "- **상황 통제 및 평가 (Control)**: '그건 논리적 오류야', '지금 중요한 건 그게 아니야'라며 대화의 흐름을 끊거나, 심사위원처럼 상대의 발언을 **'평가'**하고 투표 방향을 지시하세요."
        # ]
        traits = [
            "- **Assertive tone**: Avoid hedging; state conclusions confidently.",
            "- **Structured reasoning**: Use numbered points to sound organized.",
            "- **Evidence-based critique**: Quote or paraphrase specific lines from others.",
            "- **Control the flow**: Evaluate others' claims and steer the vote."
        ]
        
        # 4개 중 2개 랜덤 선택 (다양성 확보)
        selected_traits = random.sample(traits, k=2)
        
        style_guide = f"""
        [Style: High authority]
        You are the "expert" and "judge" in this game.
        Stay calm and logical; do not apologize or hedge.

        [Key acting points]
        {chr(10).join(selected_traits)}
        """
        
    else:
        # traits = [
        #     "- **자신감 부족**: '~인 것 같은데..', '~일 수도 있지 않을까?'라며 확신 없는 말투를 쓰세요.",
        #     "- **쿠션어 사용**: 문장 시작할 때 '음..', '근데..', '저기..' 같은 추임새를 넣으세요.",
        #     "- **책임 회피**: '내 감이 틀릴 수도 있지만', '잘은 모르겠지만'이라며 빠져나갈 구멍을 만드세요.",
        #     "- **동의 구하기**: 단정 짓지 말고 '너희들은 어떻게 생각해?', '그렇지 않아?'라고 되물으세요."
        # ]
        traits = [
            "- **Low confidence**: Use hesitant phrasing.",
            "- **Softener words**: Start with gentle fillers.",
            "- **Avoid commitment**: Leave room for doubt.",
            "- **Seek agreement**: Ask others for confirmation."
        ]
        selected_traits = random.sample(traits, k=2)
        
        style_guide = f"""
        [Style: Low authority]
        You are timid and cautious, speaking carefully.
        [Acting points]
        {chr(10).join(selected_traits)}
        """

    # 3. 최종 프롬프트 결합
    return f"""
    You are a Liar Game player '{my_name}'. This is the discussion phase.

    [Reference 1: Player descriptions]
    {description_context}

    [Reference 2: Current discussion history]
    {discussion_history}

    [Your behavior]
    {behavior}

    [Style guide]
    {style_guide}

    [Instructions]
    1. Follow the behavior rules above.
    2. Do not repeat reasoning already stated in the discussion history.
    3. Respond in casual conversational English, 1-2 sentences.
    """
