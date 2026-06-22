# AI Math Tutor (MVP)

A web app for middle-school students. A student snaps a photo of a *solved* math
problem; an AI vision model finds the mistake and acts as a **private tutor** —
guiding rather than handing over the answer. Tutoring adapts to the student's
**learning style** (from a short onboarding survey) and to their **performance**.

Python (FastAPI) backend, deployable on Vercel. Free **Gemini Flash** model for
the MVP, behind a one-file wrapper (`llm.py`) so it can be swapped for a paid
model later.

## Architecture

| File | Role |
|------|------|
| `api/index.py` | FastAPI app + routes (Vercel entrypoint) |
| `llm.py` | Model wrapper — `analyze()` (vision, JSON) + `tutor()` |
| `prompts.py` | **Bounded** tutor prompt + analysis schema (char-budget asserted) |
| `mastery.py` | Adaptive difficulty rules + compact struggle summary |
| `db.py` | Neon Postgres helpers (profiles / attempts / mastery) |
| `templates/`, `static/` | Minimal Jinja2 + vanilla-JS frontend |

**Why these choices:** Vercel's filesystem is ephemeral, so state lives in
managed **Neon Postgres** (free tier) rather than SQLite, and the uploaded image
is processed in-memory and discarded. Adaptivity is prompt-steering + simple
rules — no trained model — and the adaptive prompt is **size-capped** so it stays
cheap and predictable.

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in GEMINI_API_KEY + DATABASE_URL
uvicorn api.index:app --reload
```

- `GEMINI_API_KEY`: free key from <https://aistudio.google.com/apikey>
- `DATABASE_URL`: a Neon (or any) Postgres connection string

Open <http://localhost:8000>.

## Deploy to Vercel

```bash
npm i -g vercel
vercel            # preview deploy
```

Provision **Neon** from the Vercel Marketplace (auto-injects `DATABASE_URL`) and
add `GEMINI_API_KEY` in Project → Settings → Environment Variables.

## Swap to a paid model later

Edit `llm.py` only — replace the Gemini calls with the provider of your choice
(e.g. Claude Sonnet 4.6 for higher accuracy). Nothing else imports the SDK.
