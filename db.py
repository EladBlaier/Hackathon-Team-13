"""Neon Postgres helpers. Schema auto-creates on first use.

Vercel's filesystem is ephemeral, so state lives in managed Postgres rather
than local SQLite. Connection string comes from DATABASE_URL (injected by the
Vercel Neon integration in production).
"""

from __future__ import annotations

import os
from contextlib import contextmanager

import psycopg

from prompts import CONFIDENCES, PACES, STYLES

_SCHEMA = """
CREATE TABLE IF NOT EXISTS profiles (
    sid         TEXT PRIMARY KEY,
    name        TEXT NOT NULL DEFAULT '',
    style       TEXT NOT NULL DEFAULT 'step_by_step',
    pace        TEXT NOT NULL DEFAULT 'normal',
    grade       INTEGER NOT NULL DEFAULT 6,
    confidence  TEXT NOT NULL DEFAULT 'med'
);

CREATE TABLE IF NOT EXISTS attempts (
    id          SERIAL PRIMARY KEY,
    sid         TEXT NOT NULL,
    concept     TEXT NOT NULL,
    correct     BOOLEAN NOT NULL,
    error_type  TEXT NOT NULL DEFAULT 'none',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mastery (
    sid     TEXT NOT NULL,
    concept TEXT NOT NULL,
    score   REAL NOT NULL DEFAULT 0.5,
    PRIMARY KEY (sid, concept)
);
"""

_initialized = False


def _conninfo() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is not set")
    return url


@contextmanager
def get_conn():
    with psycopg.connect(_conninfo()) as conn:
        yield conn


def init_db() -> None:
    """Create tables if they don't exist (idempotent)."""
    global _initialized
    if _initialized:
        return
    with get_conn() as conn:
        conn.execute(_SCHEMA)
        conn.commit()
    _initialized = True


# --- Profiles ----------------------------------------------------------------

def save_profile(
    sid: str, name: str, style: str, pace: str, grade: int, confidence: str
) -> None:
    style = style if style in STYLES else "step_by_step"
    pace = pace if pace in PACES else "normal"
    confidence = confidence if confidence in CONFIDENCES else "med"
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO profiles (sid, name, style, pace, grade, confidence)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (sid) DO UPDATE SET
                name = EXCLUDED.name,
                style = EXCLUDED.style,
                pace = EXCLUDED.pace,
                grade = EXCLUDED.grade,
                confidence = EXCLUDED.confidence
            """,
            (sid, name, style, pace, grade, confidence),
        )
        conn.commit()


def get_profile(sid: str) -> dict | None:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT sid, name, style, pace, grade, confidence "
            "FROM profiles WHERE sid = %s",
            (sid,),
        ).fetchone()
    if not row:
        return None
    keys = ("sid", "name", "style", "pace", "grade", "confidence")
    return dict(zip(keys, row))


# --- Attempts ----------------------------------------------------------------

def log_attempt(sid: str, concept: str, correct: bool, error_type: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO attempts (sid, concept, correct, error_type) "
            "VALUES (%s, %s, %s, %s)",
            (sid, concept, correct, error_type),
        )
        conn.commit()


def recent_attempts(sid: str, limit: int = 20) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT concept, correct, error_type FROM attempts "
            "WHERE sid = %s ORDER BY created_at DESC LIMIT %s",
            (sid, limit),
        ).fetchall()
    return [
        {"concept": r[0], "correct": r[1], "error_type": r[2]} for r in rows
    ]


# --- Mastery -----------------------------------------------------------------

def get_mastery(sid: str, concept: str) -> float:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT score FROM mastery WHERE sid = %s AND concept = %s",
            (sid, concept),
        ).fetchone()
    return float(row[0]) if row else 0.5


def set_mastery(sid: str, concept: str, score: float) -> None:
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO mastery (sid, concept, score)
            VALUES (%s, %s, %s)
            ON CONFLICT (sid, concept) DO UPDATE SET score = EXCLUDED.score
            """,
            (sid, concept, score),
        )
        conn.commit()
