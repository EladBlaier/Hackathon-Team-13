"""Pure rules for adaptive difficulty + a compact struggle summary.

No ML model — just simple, transparent logic over attempt history. This is the
"dynamic adaptation" layer; the struggle summary is kept SHORT so it can be
safely injected into the bounded tutor prompt.
"""

from __future__ import annotations

from collections import Counter

# How far a single attempt nudges a concept's mastery score (0..1).
_STEP = 0.2


def update_mastery(prev_score: float, correct: bool) -> float:
    """Move mastery up on a correct answer, down on a mistake; clamp to 0..1."""
    delta = _STEP if correct else -_STEP
    return max(0.0, min(1.0, prev_score + delta))


def next_difficulty(score: float) -> str:
    """Pick the next problem's difficulty from a concept's mastery score."""
    if score >= 0.75:
        return "harder"
    if score <= 0.35:
        return "easier"
    return "same"


def struggle_summary(attempts: list[dict], top_n: int = 3) -> str:
    """Compact tag list of the concepts the student misses most.

    Returns e.g. "weak: fractions, sign-errors" — bounded to top_n tags so it
    never blows the tutor prompt budget. Empty string if nothing notable.
    """
    misses = Counter(
        a["concept"] for a in attempts if not a.get("correct")
    )
    top = [concept for concept, _ in misses.most_common(top_n)]
    if not top:
        return ""
    return "weak: " + ", ".join(top)
