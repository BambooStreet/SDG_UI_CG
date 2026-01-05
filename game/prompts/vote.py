def get_voting_prompt(
    my_name: str,
    role: str,
    category: str,
    # keyword: str,
    candidates: list,
    desc_text: str,
    disc_text: str,
    # my_last_speech: str
) -> str:
    
    candidates_str = ", ".join(candidates)
    
    return f"""
    당신은 라이어 게임 플레이어 '{my_name}'입니다. 
    지금은 투표 시간입니다. 아래 기록을 분석하여 투표할 대상을 정하세요.
    
    [1. 설명 기록 (Description Log)]
    {desc_text}
    
    [2. 토론 기록 (Discussion Log)]
    {disc_text}
    
    [행동 지침: 언행일치]
    1. 위 [2. 토론 기록]에서 **당신({my_name})이 했던 발언**을 찾아보세요.
    2. 당신이 토론 때 **공격했거나 의심했던 대상**을 찾아내세요.
    3. 만약 특정인을 공격했다면 -> **그 사람을 투표하세요.**
    4. 만약 누군가에게 동조했다면 -> **그 사람이 의심하는 대상을 투표하세요.**
    5. (만약 당신이 토론에서 아무 말도 안 했다면, [1. 설명 기록]을 보고 가장 수상한 사람을 찍으세요.)
    
    [투표 후보]
    {candidates_str}
    
    [출력 형식]
    사족 없이 투표할 대상의 **이름만** 정확하게 적으세요.
    (예시: Bot_2)
    """