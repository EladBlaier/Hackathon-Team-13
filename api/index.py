"""FastAPI entrypoint (Vercel runs this via Fluid Compute).

Routes:
  GET  /            -> redirect to onboarding or tutor
  GET  /onboarding  -> learning-style survey
  POST /onboarding  -> save profile, set student cookie
  GET  /tutor       -> upload + tutor page
  POST /api/tutor   -> analyze photo, log attempt, return tutoring reply
"""

from __future__ import annotations

import sys
import uuid
from pathlib import Path

# Repo root holds the shared modules + templates/static; make them importable
# whether run locally (uvicorn) or on Vercel.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, Form, Request, UploadFile, File  # noqa: E402
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from fastapi.templating import Jinja2Templates  # noqa: E402

import db  # noqa: E402
import llm  # noqa: E402
import mastery  # noqa: E402
from prompts import build_tutor_system  # noqa: E402

app = FastAPI()
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
templates = Jinja2Templates(directory=ROOT / "templates")

COOKIE = "sid"


def _sid(request: Request) -> str | None:
    return request.cookies.get(COOKIE)


@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    sid = _sid(request)
    if sid and db.get_profile(sid):
        return RedirectResponse("/tutor", status_code=303)
    return RedirectResponse("/onboarding", status_code=303)


@app.get("/onboarding", response_class=HTMLResponse)
def onboarding_page(request: Request):
    return templates.TemplateResponse("onboarding.html", {"request": request})


@app.post("/onboarding")
def onboarding_submit(
    name: str = Form(""),
    style: str = Form("step_by_step"),
    pace: str = Form("normal"),
    grade: int = Form(6),
    confidence: str = Form("med"),
):
    db.init_db()
    sid = str(uuid.uuid4())
    db.save_profile(sid, name, style, pace, grade, confidence)
    resp = RedirectResponse("/tutor", status_code=303)
    resp.set_cookie(COOKIE, sid, httponly=True, max_age=60 * 60 * 24 * 30)
    return resp


@app.get("/tutor", response_class=HTMLResponse)
def tutor_page(request: Request):
    sid = _sid(request)
    if not sid or not db.get_profile(sid):
        return RedirectResponse("/onboarding", status_code=303)
    return templates.TemplateResponse("tutor.html", {"request": request})


@app.post("/api/tutor")
async def api_tutor(request: Request, photo: UploadFile = File(...)):
    sid = _sid(request)
    if not sid:
        return JSONResponse({"error": "no profile"}, status_code=400)
    profile = db.get_profile(sid)
    if not profile:
        return JSONResponse({"error": "no profile"}, status_code=400)

    image_bytes = await photo.read()
    mime = photo.content_type or "image/jpeg"

    # Call A — structured grading.
    analysis = llm.analyze(image_bytes, mime)

    # Log the attempt + update mastery.
    db.log_attempt(sid, analysis.concept, analysis.is_correct, analysis.error_type)
    prev = db.get_mastery(sid, analysis.concept)
    score = mastery.update_mastery(prev, analysis.is_correct)
    db.set_mastery(sid, analysis.concept, score)

    # Call B — bounded, profile-aware tutoring.
    summary = mastery.struggle_summary(db.recent_attempts(sid))
    system = build_tutor_system(
        profile["style"], profile["pace"], profile["grade"],
        profile["confidence"], summary,
    )
    context = (
        f"Problem: {analysis.problem}\n"
        f"Correct: {analysis.is_correct}\n"
        f"Mistake type: {analysis.error_type} (concept: {analysis.concept})\n"
        "Tutor the student now."
    )
    reply = llm.tutor(system, context)

    return JSONResponse(
        {
            "is_correct": analysis.is_correct,
            "concept": analysis.concept,
            "error_type": analysis.error_type,
            "reply": reply,
            "next_difficulty": mastery.next_difficulty(score),
        }
    )
