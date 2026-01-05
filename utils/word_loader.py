import json
import random
import os

# 현재 파일 word_loader.py를 기준으로 data/words.json 위치를 찾는다.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE_PATH = os.path.join(BASE_DIR, '..', 'data', 'words.json')

class WordLoader:
    """
    JSON 파일에서 단어 목록을 로드하고 무작위 단어를 제공하는 클래스
    """
    def __init__(self, file_path:str=DATA_FILE_PATH):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                self.word_data = json.load(f)
            if not self.word_data:
                raise ValueError("단어 파일이 비어있습니다.")
        except FileNotFoundError:
            print(f"오류: {file_path} 파일을 찾을 수 없습니다.")
            print("현재 경로:", os.getcwd())
            self.word_data = {}
        except json.JSONDecodeError:
            print(f"오류: {file_path} 파일의 형식이 올바르지 않습니다.")
            self.word_data = {}

    def get_random_topic_and_keyword(self) -> tuple[str,str] | tuple[None,None]:
        """
        무작위 카테고리와 해당 카테고리의 무작위 제시어를 반환한다.
        :return: (카테고리, 제시어) 튜플. 데이터 로드 실패 시 (None, None)
        """
        if not self.word_data:
            return None, None
        category = random.choice(list(self.word_data.keys()))
        keyword = random.choice(self.word_data[category])

        return category, keyword
