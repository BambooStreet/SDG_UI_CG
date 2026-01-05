# backend/db.py
import os
from dotenv import load_dotenv
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Json

# Next가 쓰는 .env.local 재사용 (루트에서 uvicorn 실행한다는 전제)
load_dotenv(".env.local")

def _conn():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("Missing DATABASE_URL (set it in .env.local or env)")
    return psycopg.connect(url, row_factory=dict_row)

def get_session_state(session_id: str) -> dict:
    with _conn() as conn:
        row = conn.execute(
            "select state_json from sessions where session_id = %s::uuid",
            (session_id,),
        ).fetchone()
        if not row:
            raise KeyError("session not found")
        return row["state_json"] or {}

def save_session_state(session_id: str, state: dict) -> None:
    with _conn() as conn:
        conn.execute(
            "update sessions set state_json = %s::jsonb where session_id = %s::uuid",
            (Json(state), session_id),
        )
        conn.commit()

def insert_event(session_id: str, type_: str, payload: dict) -> None:
    with _conn() as conn:
        conn.execute(
            "insert into events (session_id, type, payload) values (%s::uuid, %s, %s::jsonb)",
            (session_id, type_, Json(payload)),
        )
        conn.commit()
