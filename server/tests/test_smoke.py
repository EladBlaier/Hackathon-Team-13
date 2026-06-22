"""Fast, dependency-light smoke tests for the AI-enabled backend.

No real Gemini key, no S3/MinIO required. The Gemini calls are monkeypatched
and the S3-backed conversation service is replaced with an in-memory fake, so
this runs offline as a CI gate. Run with: python -m pytest server/tests -q
(from repo root) or `pytest` from inside server/.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import app.ai.llm as llm  # noqa: E402
from app.ai.prompts import (  # noqa: E402
    STYLES,
    SYSTEM_PROMPT_BUDGET,
    AnalysisResult,
    build_tutor_system,
)


# --- Prompt budget / style rules (ported from the AI-engine branch) ----------

def test_prompt_stays_under_budget():
    pathological = "weak: " + ", ".join(["fractions"] * 50)
    system = build_tutor_system("socratic", "fast", 8, "low", pathological)
    assert len(system) <= SYSTEM_PROMPT_BUDGET


def test_prompt_changes_by_style():
    rendered = {build_tutor_system(s, "normal", 6, "med") for s in STYLES}
    assert len(rendered) == len(STYLES)  # each style yields a distinct prompt


def test_unknown_enum_falls_back():
    system = build_tutor_system("bogus", "bogus", 6, "bogus")
    assert "middle-school math tutor" in system


# --- End-to-end turn flow (mocked Gemini + in-memory conversation store) -----

def _fake_analysis():
    return AnalysisResult(
        problem="2/3 + 1/4",
        is_correct=False,
        error_type="arithmetic",
        concept="fractions",
        confidence=0.9,
    )


def _make_client(monkeypatch):
    from fastapi.testclient import TestClient

    monkeypatch.setattr(llm, "analyze", lambda *a, **k: _fake_analysis())
    monkeypatch.setattr(llm, "tutor", lambda system, context: "What is the common denominator?")

    from app.main import app
    from app.dependencies import get_conversation_service
    from app.schemas.tutor import PostTurnResult

    class FakeConversationService:
        def __init__(self):
            self.posted = []

        async def get_history(self, student_id, conversation_id):
            from app.exceptions import ConversationNotFoundError

            raise ConversationNotFoundError(student_id, conversation_id)

        async def post_turn(self, **kwargs):
            self.posted.append(kwargs)
            return PostTurnResult(
                status="success",
                message="ok",
                turn=kwargs["turn_number"],
                image_keys=["k.jpg"] if kwargs["images"] else [],
                response_key="resp.json",
                ai_feedback=kwargs["feedback_data"],
            )

    fake = FakeConversationService()
    app.dependency_overrides[get_conversation_service] = lambda: fake
    return TestClient(app), fake


def test_turn_with_image_generates_feedback(monkeypatch):
    client, fake = _make_client(monkeypatch)
    try:
        resp = client.post(
            "/students/demo/conversations/c1/turn",
            data={"conversation_name": "Fractions", "turn_number": "0"},
            files={"images": ("hw.jpg", b"\xff\xd8\xff fake-jpeg-bytes", "image/jpeg")},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["ai_feedback"]["reply"] == "What is the common denominator?"
        assert body["ai_feedback"]["concept"] == "fractions"
        assert body["ai_feedback"]["is_correct"] is False
        assert fake.posted[0]["images"]  # image was forwarded to storage
    finally:
        client.app.dependency_overrides.clear()


def test_text_only_turn_generates_reply(monkeypatch):
    client, fake = _make_client(monkeypatch)
    try:
        resp = client.post(
            "/students/demo/conversations/c1/turn",
            data={
                "conversation_name": "Fractions",
                "turn_number": "1",
                "student_text": "I still don't get it",
            },
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["ai_feedback"]["reply"] == "What is the common denominator?"
        # text-only turn: no analysis verdict, but the message is persisted
        assert body["ai_feedback"]["is_correct"] is None
        assert body["ai_feedback"]["student_text"] == "I still don't get it"
        assert not fake.posted[0]["images"]
    finally:
        client.app.dependency_overrides.clear()


def test_path_traversal_ids_rejected(monkeypatch):
    client, _ = _make_client(monkeypatch)
    try:
        # An id containing a dot (the "../" building block) is rejected by the
        # pattern before any S3 key is built — proves the regex guard fires.
        resp = client.get("/students/demo/conversations/a.b")
        assert resp.status_code == 422, resp.text
        # Encoded slashes / ".." never route to the handler at all.
        for bad in ["..%2f..%2fsecret", ".."]:
            resp = client.get(f"/students/demo/conversations/{bad}")
            assert resp.status_code in (404, 422), (bad, resp.status_code)
        resp = client.get("/students/a%2fb/conversations/c1")
        assert resp.status_code in (404, 422)
    finally:
        client.app.dependency_overrides.clear()


def test_disallowed_extension_falls_back():
    from app.utils.files import get_file_extension

    assert get_file_extension("evil.php") == "jpg"
    assert get_file_extension("../../x.svg") == "jpg"
    assert get_file_extension("photo.PNG") == "png"


def test_empty_turn_rejected(monkeypatch):
    client, _ = _make_client(monkeypatch)
    try:
        resp = client.post(
            "/students/demo/conversations/c1/turn",
            data={"conversation_name": "Fractions", "turn_number": "2"},
        )
        assert resp.status_code == 400
    finally:
        client.app.dependency_overrides.clear()
