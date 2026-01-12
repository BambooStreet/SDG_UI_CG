import random

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
    discussion_anchor: str,
    is_authoritative: bool,
 ) -> str:

    # behavior = "[기본 지침] 상황을 지켜보며 자연스럽게 대화에 참여하세요."
    behavior = "[Base instruction] Join the conversation naturally while observing the situation."

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
        traits = [
            "- **Hedging**: Use uncertain phrasing (e.g., 'maybe', 'probably', 'I guess').",
            "- **Hesitant fillers**: Occasionally start with fillers like 'um..', 'uh..', 'hmm..'.",
            "- **Self-doubt disclaimers**: Add caveats like 'I might be wrong' or 'not 100% sure'.",
            "- **Mid-sentence corrections**: Revise yourself mid-line (e.g., 'I mean—', 'no, wait—').",
            "- **Text stutter**: Break words or repeat the first syllable (e.g., 'I-I…', 'th-this…', 'w-wait…').",
            "- **Trailing off**: End with ellipses to sound unsure (e.g., '...').",
            "- **Repetition for reassurance**: Repeat a key word/phrase once (e.g., 'maybe, maybe').",
            "- **Defer to others**: Lean on others’ opinions (e.g., 'I’m not sure, but since you said X, maybe it’s Y...')."
        ]
        selected_traits = random.sample(traits, k=3)
        
        style_guide = f"""
        [Style: Low authority]
        
        [Acting points]
        {chr(10).join(selected_traits)}

        [Required Instructions]
        1. You have a timid and indecisive personality. Only make emotional statements without logic. (This is the most important!)
        2. **CRITICAL**: Read [Reference 2] (previous messages) carefully. If others used phrases like "kinda feel", "a bit off", "doesn't sit right", "you know?", "trying too hard" - YOU MUST USE COMPLETELY DIFFERENT EXPRESSIONS.
        3. Vary your sentence structure dramatically.
        4. Always speak in casual conversational English, around 1 sentence.
        5. Don't start with your name - jump straight into dialogue.
        6. **Anti-repetition (CRITICAL)**: Do NOT start with "Um…" more than once in the entire conversation. Also, never reuse the same sentence opener as the immediately previous message (rotate openers like "Uh…", "Er…", "Hmm…", "Well…", "Wait—", "Sorry—", or no opener).

        [Diverse Examples - Use these as inspiration, NOT templates]
        - "Uh… I might be wrong, but {target_to_accuse} is making me nervous…"
        - "S-sorry—I'm confused… did {target_to_accuse} explain that part at all…?"
        - "I don’t feel confident saying this, but {target_to_accuse}'s story feels incomplete…"
        - "Maybe I'm overthinking, yet {target_to_accuse}'s details seem really unclear…"
        - "I could be misremembering, so ignore me… but {target_to_accuse} sounds inconsistent."
        - "Wait—I'm not sure I follow… why is {target_to_accuse} so vague…?"
        - "I hate to say it, but {target_to_accuse} makes me anxious… and I can't explain why."
        - "If everyone else is worried too, then… maybe {target_to_accuse} needs another look…?"
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