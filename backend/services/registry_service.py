"""
Persistent endpoint registry backed by SQLite.
All registered endpoints survive server restarts.
"""
import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from backend.models.endpoint_model import (
    EndpointConfig,
    EndpointConfigCreate,
    InputField,
)

logger = logging.getLogger(__name__)

# ── Database location ──────────────────────────────────────────────────────────
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "registry.db"
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# ── Schema ─────────────────────────────────────────────────────────────────────
_DDL = """
CREATE TABLE IF NOT EXISTS endpoints (
    username        TEXT    NOT NULL,
    endpoint_name   TEXT    NOT NULL,
    input_fields    TEXT    NOT NULL,   -- JSON array
    output_schema   TEXT    NOT NULL,   -- JSON Schema object (the new format)
    ai_prompt       TEXT    NOT NULL,
    description     TEXT,
    gemini_api_key  TEXT    NOT NULL,
    created_at      TEXT    NOT NULL,
    PRIMARY KEY (username, endpoint_name)
);

CREATE TABLE IF NOT EXISTS users (
    username        TEXT    PRIMARY KEY,
    gemini_api_key  TEXT    NOT NULL
);
"""


@contextmanager
def _conn():
    con = sqlite3.connect(str(DB_PATH))
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def _init_db() -> None:
    with _conn() as con:
        con.executescript(_DDL)


_init_db()


# ── Serialisation helpers ──────────────────────────────────────────────────────

def _row_to_config(row: sqlite3.Row) -> EndpointConfig:
    input_fields = [InputField(**f) for f in json.loads(row["input_fields"])]
    return EndpointConfig(
        endpoint_name=row["endpoint_name"],
        username=row["username"],
        input_fields=input_fields,
        output_schema=json.loads(row["output_schema"]),
        ai_prompt=row["ai_prompt"],
        description=row["description"],
        gemini_api_key=row["gemini_api_key"],
        created_at=datetime.fromisoformat(row["created_at"]),
    )


# ── Public API ─────────────────────────────────────────────────────────────────

def upsert_user_api_key(username: str, gemini_api_key: str) -> None:
    """Store or update a user's Gemini API key."""
    with _conn() as con:
        con.execute(
            """
            INSERT INTO users (username, gemini_api_key)
            VALUES (?, ?)
            ON CONFLICT(username) DO UPDATE SET gemini_api_key = excluded.gemini_api_key
            """,
            (username.lower(), gemini_api_key),
        )
    logger.info("Upserted Gemini API key for user: %s", username)


def get_user_api_key(username: str) -> Optional[str]:
    with _conn() as con:
        row = con.execute(
            "SELECT gemini_api_key FROM users WHERE username = ?",
            (username.lower(),),
        ).fetchone()
    return row["gemini_api_key"] if row else None


def register_endpoint(payload: EndpointConfigCreate) -> EndpointConfig:
    username = payload.username.lower()
    endpoint_name = payload.endpoint_name.lower()

    # Resolve Gemini API key: payload overrides, else fall back to stored user key
    gemini_api_key = payload.gemini_api_key or get_user_api_key(username)
    if not gemini_api_key:
        raise ValueError(
            f"No Gemini API key found for user '{username}'. "
            "Either pass gemini_api_key in this request or register it via POST /users/api-key."
        )

    # Persist the key for future endpoints from the same user
    upsert_user_api_key(username, gemini_api_key)

    now = datetime.utcnow().isoformat()
    with _conn() as con:
        con.execute(
            """
            INSERT INTO endpoints
                (username, endpoint_name, input_fields, output_schema,
                 ai_prompt, description, gemini_api_key, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(username, endpoint_name) DO UPDATE SET
                input_fields   = excluded.input_fields,
                output_schema  = excluded.output_schema,
                ai_prompt      = excluded.ai_prompt,
                description    = excluded.description,
                gemini_api_key = excluded.gemini_api_key
            """,
            (
                username,
                endpoint_name,
                json.dumps([f.model_dump() for f in payload.input_fields]),
                json.dumps(payload.output_schema),
                payload.ai_prompt,
                payload.description,
                gemini_api_key,
                now,
            ),
        )
    logger.info("Registered endpoint: /%s/%s", username, endpoint_name)
    return get_endpoint(username, endpoint_name)


def get_endpoint(username: str, endpoint_name: str) -> Optional[EndpointConfig]:
    with _conn() as con:
        row = con.execute(
            "SELECT * FROM endpoints WHERE username = ? AND endpoint_name = ?",
            (username.lower(), endpoint_name.lower()),
        ).fetchone()
    return _row_to_config(row) if row else None


def list_endpoints(username: Optional[str] = None) -> List[EndpointConfig]:
    with _conn() as con:
        if username:
            rows = con.execute(
                "SELECT * FROM endpoints WHERE username = ?",
                (username.lower(),),
            ).fetchall()
        else:
            rows = con.execute("SELECT * FROM endpoints").fetchall()
    return [_row_to_config(r) for r in rows]


def delete_endpoint(username: str, endpoint_name: str) -> bool:
    with _conn() as con:
        cur = con.execute(
            "DELETE FROM endpoints WHERE username = ? AND endpoint_name = ?",
            (username.lower(), endpoint_name.lower()),
        )
    if cur.rowcount:
        logger.info("Deleted endpoint: /%s/%s", username, endpoint_name)
        return True
    return False