"""
Persistent endpoint registry backed by Nile (PostgreSQL via psycopg2).
All function signatures are identical to the SQLite/Turso versions.
"""
import json
import logging
import os
import secrets
from contextlib import contextmanager
from datetime import datetime
from typing import Dict, List, Optional
from dotenv import load_dotenv 
import bcrypt
import psycopg2
import psycopg2.extras

from backend.models.endpoint_model import (
    EndpointConfig,
    EndpointConfigCreate,
    EndpointConfigUpdate,
    InputField,
)

load_dotenv()

logger = logging.getLogger(__name__)

# ── Connection ─────────────────────────────────────────────────────────────────

NILE_DB_URL = os.environ["NILE_DB_URL"]


@contextmanager
def _conn():
    con = psycopg2.connect(NILE_DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


# ── Schema ─────────────────────────────────────────────────────────────────────

_DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS endpoints (
        username        TEXT    NOT NULL,
        endpoint_name   TEXT    NOT NULL,
        input_fields    TEXT    NOT NULL,
        output_schema   TEXT    NOT NULL,
        ai_prompt       TEXT    NOT NULL,
        description     TEXT,
        gemini_api_key  TEXT    NOT NULL,
        created_at      TEXT    NOT NULL,
        PRIMARY KEY (username, endpoint_name)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS users (
        username        TEXT    PRIMARY KEY,
        password_hash   TEXT    NOT NULL,
        gemini_api_key  TEXT,
        token           TEXT
    )
    """,
]


async def init_db_pool() -> None:
    """No-op for psycopg2 (sync driver) — satisfies the startup hook."""
    pass


def init_db() -> None:
    with _conn() as con:
        cur = con.cursor()
        for stmt in _DDL_STATEMENTS:
            cur.execute(stmt)
    logger.info("Nile DB initialized.")


# ── Password helpers ───────────────────────────────────────────────────────────

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


# ── Serialisation helpers ──────────────────────────────────────────────────────

def _row_to_config(row: dict) -> EndpointConfig:
    return EndpointConfig(
        endpoint_name  = row["endpoint_name"],
        username       = row["username"],
        input_fields   = [InputField(**f) for f in json.loads(row["input_fields"])],
        output_schema  = json.loads(row["output_schema"]),
        ai_prompt      = row["ai_prompt"],
        description    = row["description"],
        gemini_api_key = row["gemini_api_key"],
        created_at     = datetime.fromisoformat(row["created_at"]),
    )


# ── User management ────────────────────────────────────────────────────────────

def register_user(username: str, password: str, gemini_api_key: Optional[str] = None) -> None:
    """Create a new user. Raises ValueError if username already exists."""
    username = username.lower()
    with _conn() as con:
        cur = con.cursor()
        cur.execute("SELECT username FROM users WHERE username = %s", (username,))
        if cur.fetchone():
            raise ValueError(f"Username '{username}' is already taken.")
        cur.execute(
            "INSERT INTO users (username, password_hash, gemini_api_key) VALUES (%s, %s, %s)",
            (username, _hash_password(password), gemini_api_key),
        )
    logger.info("Registered new user: %s", username)


def authenticate_user(username: str, password: str) -> Optional[str]:
    """Verify credentials, generate + store a session token, return it. None on failure."""
    username = username.lower()
    with _conn() as con:
        cur = con.cursor()
        cur.execute("SELECT password_hash FROM users WHERE username = %s", (username,))
        row = cur.fetchone()
        if not row or not _verify_password(password, row["password_hash"]):
            return None
        token = secrets.token_urlsafe(32)
        cur.execute("UPDATE users SET token = %s WHERE username = %s", (token, username))
    logger.info("User logged in: %s", username)
    return token


def verify_token(username: str, token: str) -> bool:
    """Check that a bearer token matches the stored token for this user."""
    username = username.lower()
    with _conn() as con:
        cur = con.cursor()
        cur.execute("SELECT token FROM users WHERE username = %s", (username,))
        row = cur.fetchone()
    if not row:
        return False
    stored = row["token"]
    return bool(stored and secrets.compare_digest(stored, token))


def verify_password_for_user(username: str, password: str) -> bool:
    """Credential check without issuing a token."""
    username = username.lower()
    with _conn() as con:
        cur = con.cursor()
        cur.execute("SELECT password_hash FROM users WHERE username = %s", (username,))
        row = cur.fetchone()
    if not row:
        return False
    return _verify_password(password, row["password_hash"])


def upsert_user_api_key(username: str, gemini_api_key: str) -> None:
    """Update a user's stored Gemini API key."""
    with _conn() as con:
        cur = con.cursor()
        cur.execute(
            "UPDATE users SET gemini_api_key = %s WHERE username = %s",
            (gemini_api_key, username.lower()),
        )
    logger.info("Updated Gemini API key for user: %s", username)


def get_user_api_key(username: str) -> Optional[str]:
    with _conn() as con:
        cur = con.cursor()
        cur.execute(
            "SELECT gemini_api_key FROM users WHERE username = %s",
            (username.lower(),),
        )
        row = cur.fetchone()
    return row["gemini_api_key"] if row else None


# ── Endpoint CRUD ──────────────────────────────────────────────────────────────

def register_endpoint(payload: EndpointConfigCreate) -> EndpointConfig:
    username      = payload.username.lower()
    endpoint_name = payload.endpoint_name.lower()

    gemini_api_key = payload.gemini_api_key or get_user_api_key(username)
    if not gemini_api_key:
        raise ValueError(
            f"No Gemini API key found for user '{username}'. "
            "Either pass gemini_api_key in this request or set it via POST /users/api-key."
        )

    upsert_user_api_key(username, gemini_api_key)

    now = datetime.utcnow().isoformat()
    with _conn() as con:
        cur = con.cursor()
        cur.execute(
            """
            INSERT INTO endpoints
                (username, endpoint_name, input_fields, output_schema,
                 ai_prompt, description, gemini_api_key, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (username, endpoint_name) DO UPDATE SET
                input_fields   = EXCLUDED.input_fields,
                output_schema  = EXCLUDED.output_schema,
                ai_prompt      = EXCLUDED.ai_prompt,
                description    = EXCLUDED.description,
                gemini_api_key = EXCLUDED.gemini_api_key
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


def update_endpoint(
    username: str, endpoint_name: str, patch: EndpointConfigUpdate
) -> Optional[EndpointConfig]:
    """Partially update an existing endpoint. Returns updated config or None if not found."""
    username      = username.lower()
    endpoint_name = endpoint_name.lower()

    existing = get_endpoint(username, endpoint_name)
    if not existing:
        return None

    updates: Dict[str, object] = {}
    if patch.input_fields is not None:
        updates["input_fields"] = json.dumps([f.model_dump() for f in patch.input_fields])
    if patch.output_schema is not None:
        updates["output_schema"] = json.dumps(patch.output_schema)
    if patch.ai_prompt is not None:
        updates["ai_prompt"] = patch.ai_prompt
    if patch.description is not None:
        updates["description"] = patch.description
    if patch.gemini_api_key is not None:
        updates["gemini_api_key"] = patch.gemini_api_key
        upsert_user_api_key(username, patch.gemini_api_key)

    if not updates:
        return existing

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    values     = list(updates.values()) + [username, endpoint_name]

    with _conn() as con:
        cur = con.cursor()
        cur.execute(
            f"UPDATE endpoints SET {set_clause} WHERE username = %s AND endpoint_name = %s",
            values,
        )

    logger.info("Updated endpoint: /%s/%s | fields: %s", username, endpoint_name, list(updates))
    return get_endpoint(username, endpoint_name)


def get_endpoint(username: str, endpoint_name: str) -> Optional[EndpointConfig]:
    with _conn() as con:
        cur = con.cursor()
        cur.execute(
            "SELECT * FROM endpoints WHERE username = %s AND endpoint_name = %s",
            (username.lower(), endpoint_name.lower()),
        )
        row = cur.fetchone()
    return _row_to_config(row) if row else None


def list_endpoints(username: Optional[str] = None) -> List[EndpointConfig]:
    with _conn() as con:
        cur = con.cursor()
        if username:
            cur.execute(
                "SELECT * FROM endpoints WHERE username = %s",
                (username.lower(),),
            )
        else:
            cur.execute("SELECT * FROM endpoints")
        rows = cur.fetchall()
    return [_row_to_config(row) for row in rows]


def delete_endpoint(username: str, endpoint_name: str) -> bool:
    with _conn() as con:
        cur = con.cursor()
        cur.execute(
            "DELETE FROM endpoints WHERE username = %s AND endpoint_name = %s",
            (username.lower(), endpoint_name.lower()),
        )
        deleted = cur.rowcount > 0
    if deleted:
        logger.info("Deleted endpoint: /%s/%s", username, endpoint_name)
    return deleted