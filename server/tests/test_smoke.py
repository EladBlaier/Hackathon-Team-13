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
from app.config import settings as app_settings  # noqa: E402
from app.exceptions import FileKeyNotFoundError  # noqa: E402
from app.schemas.tutor import (  # noqa: E402
    ConversationContext,
    LearnerProfile,
    TutoringPlan,
)


class FakeS3:
    """In-memory stand-in for AsyncS3Service's JSON get/put used by the brain."""

    def __init__(self) -> None:
        self.store: dict[str, object] = {}

    async def get_object_as_json(self, bucket: str, key: str):
        if key not in self.store:
            raise FileKeyNotFoundError(bucket, key)
        return self.store[key]

    async def put_object_json(self, bucket: str, key: str, data) -> None:
        self.store[key] = data


def _fake_plan(*_a, **_k) -> TutoringPlan:
    return TutoringPlan(
        misconception="forgot common denominator",
        next_move="ask for the common denominator",
        do_not_reveal="the final sum",
        guiding_question="What is the common denominator?",
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
    monkeypatch.setattr(llm, "plan", _fake_plan)
    monkeypatch.setattr(llm, "summarize", lambda prev, latest: "session summary")

    from app.main import app
    from app.dependencies import get_conversation_service, get_tutor_ai_service
    from app.schemas.tutor import PostTurnResult
    from app.services.context_service import ContextService
    from app.services.profile_service import ProfileService
    from app.services.tutor_ai_service import TutorAIService

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
    fake_s3 = FakeS3()
    profiles = ProfileService(fake_s3, app_settings)
    contexts = ContextService(fake_s3, app_settings, fake)
    ai = TutorAIService(profiles, contexts, app_settings)

    app.dependency_overrides[get_conversation_service] = lambda: fake
    app.dependency_overrides[get_tutor_ai_service] = lambda: ai
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


# --- Adaptation: deterministic mastery math (no S3, no LLM) -------------------

def test_profile_records_mastery_and_ranks_struggle():
    p = LearnerProfile()
    p.record("fractions", is_correct=False, error_type="arithmetic")
    p.record("fractions", is_correct=False, error_type="sign")
    p.record("decimals", is_correct=True, error_type="none")

    assert p.total_turns == 3
    assert p.concepts["fractions"].attempts == 2
    assert p.concepts["fractions"].correct == 0
    assert p.concepts["decimals"].accuracy == 1.0

    summary = p.struggle_summary()
    assert "fractions" in summary  # weakest concept surfaces
    assert "sign" in summary  # carries the latest error type
    assert "decimals" not in summary  # all-correct concept is not a struggle


def test_profile_struggle_empty_when_no_evidence():
    assert LearnerProfile().struggle_summary() == ""
    p = LearnerProfile()
    p.record("fractions", is_correct=True, error_type="none")
    assert p.struggle_summary() == ""


def test_profile_defaults_match_legacy_behaviour():
    # A cold-start profile must reproduce the old fixed defaults exactly.
    p = LearnerProfile()
    assert (p.style, p.pace, p.grade, p.confidence) == ("step_by_step", "normal", 6, "med")


# --- Managed history: context trimming + rolling summary ----------------------

def test_context_update_trims_to_two_and_summarizes(monkeypatch):
    import asyncio

    from app.services.context_service import ContextService

    monkeypatch.setattr(llm, "summarize", lambda prev, latest: "running summary")

    class _NoHistoryConv:
        async def get_history(self, *a, **k):
            from app.exceptions import ConversationNotFoundError

            raise ConversationNotFoundError("s", "c")

    contexts = ContextService(FakeS3(), app_settings, _NoHistoryConv())
    ctx = ConversationContext()

    async def run():
        for i in range(3):
            await contexts.update(
                "s", "c", ctx, student_text=f"msg{i}", analysis=None, reply=f"reply{i}"
            )

    asyncio.run(run())

    assert ctx.turn_count == 3
    assert len(ctx.recent_exchanges) == 2  # only the last two kept verbatim
    assert ctx.recent_exchanges[-1].student == "msg2"
    assert ctx.rolling_summary == "running summary"
    # render() exposes the memory as a prompt-ready block
    rendered = ctx.render()
    assert "running summary" in rendered
    assert "msg2" in rendered


# --- Verdict branching: the graded result drives the tutor directive ----------

def _situation_text(analysis):
    from app.services.tutor_ai_service import TutorAIService

    return "\n".join(TutorAIService._situation(analysis, student_text=""))


def test_correct_answer_directive_affirms_and_asks_whats_next():
    analysis = AnalysisResult(
        problem="2/3 + 1/4",
        is_correct=True,
        error_type="none",
        concept="fractions",
        confidence=0.95,
        student_answer="11/12",
        observation="found a common denominator of 12 correctly",
    )
    text = _situation_text(analysis)
    assert "CORRECT" in text
    assert "what they'd like to do next" in text
    assert "common denominator of 12" in text  # grounded in the observation


def test_wrong_answer_directive_guides_to_fix():
    analysis = AnalysisResult(
        problem="2/3 + 1/4",
        is_correct=False,
        error_type="arithmetic",
        concept="fractions",
        confidence=0.9,
        student_answer="3/7",
        observation="added numerators and denominators directly",
    )
    text = _situation_text(analysis)
    assert "INCORRECT" in text
    assert "arithmetic" in text and "fractions" in text
    assert "without revealing the answer" in text


def test_low_confidence_directive_asks_to_confirm():
    analysis = AnalysisResult(
        problem="(unclear)",
        is_correct=False,
        error_type="none",
        concept="unknown",
        confidence=0.2,  # below LOW_CONFIDENCE
        student_answer="",
        observation="",
    )
    text = _situation_text(analysis)
    assert "confirm or re-share" in text
    assert "CORRECT" not in text  # must not pretend to have graded it
