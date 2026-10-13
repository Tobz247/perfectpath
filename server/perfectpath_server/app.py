"""PerfectPath analysis API.

Uploaded audio is analysed and then deleted; only the derived pitch summary is
returned. Separated stems are never stored or sent back (see the legal notes in
the README).
"""

import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from .pitch import summarize_line
from .separation import separate_vocals

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
ALLOWED_SUFFIXES = {".mp3", ".m4a", ".wav", ".flac", ".ogg", ".aac"}

app = FastAPI(title="PerfectPath analysis")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/analyze")
def analyze(file: UploadFile = File(...), rights_confirmed: bool = Form(False)) -> dict:
    if not rights_confirmed:
        raise HTTPException(400, "Please confirm you have the right to use this recording.")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(415, f"Unsupported file type. Use one of: {', '.join(sorted(ALLOWED_SUFFIXES))}.")

    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File is larger than 50 MB.")

    with tempfile.TemporaryDirectory() as workdir:
        path = Path(workdir) / f"upload{suffix}"
        path.write_bytes(data)
        vocals, sample_rate = separate_vocals(path)

    line = summarize_line(vocals, sample_rate, name="Lead vocal")
    if line is None:
        raise HTTPException(422, "Couldn't find enough clear singing in this recording.")
    return {"lines": [line]}
