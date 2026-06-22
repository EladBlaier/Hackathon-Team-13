"""Vercel Python entrypoint.

Vercel runs files under `api/` as serverless functions. Our FastAPI app lives
in `app/main.py`; this thin shim makes the package importable and re-exports
the ASGI `app` so Vercel can serve it. The catch-all rewrite in `vercel.json`
sends every path here, and FastAPI's own router handles the rest.
"""

from __future__ import annotations

import sys
from pathlib import Path

# `server/` (the parent of this file's directory) holds the `app` package.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.main import app  # noqa: E402

__all__ = ["app"]
