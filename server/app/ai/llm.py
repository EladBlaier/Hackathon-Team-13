"""Thin model wrapper. The provider/model lives here ONLY.

MVP uses Google Gemini Flash (free tier via Google AI Studio). To move to a
paid model later (e.g. Claude Sonnet 4.6), swap the two functions below — no
other file imports the provider SDK.
"""

from __future__ import annotations

import os

from google import genai
from google.genai import types

from app.ai.prompts import (
    ANALYSIS_PROMPT,
    CONTEXT_SUMMARY_PROMPT,
    PLAN_PROMPT,
    AnalysisResult,
)
from app.schemas.tutor import TutoringPlan

# Free-tier, vision-capable, good at math. Confirm the current free model id
# at https://aistudio.google.com/ — kept here so it changes in one place.
MODEL = "gemini-3.1-flash-lite"

_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set")
        _client = genai.Client(api_key=api_key)
    return _client


def analyze(image_bytes: bytes, mime_type: str = "image/jpeg") -> AnalysisResult:
    """Call A — structured grading of the photo (drives logging + mastery)."""
    resp = _get_client().models.generate_content(
        model=MODEL,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            ANALYSIS_PROMPT,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=AnalysisResult,
        ),
    )
    # The SDK parses response_schema into .parsed for us.
    parsed = resp.parsed
    if isinstance(parsed, AnalysisResult):
        return parsed
    return AnalysisResult.model_validate(parsed)


def plan(system: str, context: str) -> TutoringPlan:
    """Call B — structured private plan the tutor commits to before replying.

    Forcing a small schema-checked plan out of the weak free model yields far
    more deliberate pedagogy than a single unstructured reply call.
    """
    resp = _get_client().models.generate_content(
        model=MODEL,
        contents=[f"{PLAN_PROMPT}\n\n{context}"],
        config=types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
            response_schema=TutoringPlan,
            max_output_tokens=400,
        ),
    )
    parsed = resp.parsed
    if isinstance(parsed, TutoringPlan):
        return parsed
    return TutoringPlan.model_validate(parsed)


def tutor(system: str, context: str) -> str:
    """Call C — the human-facing tutoring reply (bounded system prompt)."""
    resp = _get_client().models.generate_content(
        model=MODEL,
        contents=[context],
        config=types.GenerateContentConfig(
            system_instruction=system,
            max_output_tokens=600,
        ),
    )
    return (resp.text or "").strip()


def summarize(prev_summary: str, latest_exchange: str) -> str:
    """Compact the running conversation memory after each turn (context.json)."""
    resp = _get_client().models.generate_content(
        model=MODEL,
        contents=[
            f"{CONTEXT_SUMMARY_PROMPT}\n\n"
            f"Previous summary:\n{prev_summary or '(none yet)'}\n\n"
            f"Latest exchange:\n{latest_exchange}"
        ],
        config=types.GenerateContentConfig(max_output_tokens=200),
    )
    return (resp.text or "").strip()
