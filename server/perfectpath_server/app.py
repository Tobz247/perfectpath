"""PerfectPath analysis API.

Uploaded audio is analysed and then deleted; only the derived pitch summary is
returned. Separated stems are never stored or sent back (see the legal notes in
the README).
"""

import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from .pitch import summarize_line
from .score import summarize_score
from .harmony import backing_lines
from .separation import separate_vocals, split_backing

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
ALLOWED_SUFFIXES = {".mp3", ".m4a", ".wav", ".flac", ".ogg", ".aac"}
SCORE_SUFFIXES = {".musicxml", ".xml", ".mxl"}
MAX_SCORE_BYTES = 10 * 1024 * 1024

app = FastAPI(title="PerfectPath analysis")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _read_limited(file: UploadFile, limit: int) -> bytes:
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, f"File is larger than {limit // (1024 * 1024)} MB.")
    return data


@app.post("/analyze")
def analyze(file: UploadFile = File(...), rights_confirmed: bool = Form(False)) -> dict:
    if not rights_confirmed:
        raise HTTPException(400, "Please confirm you have the right to use this recording.")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(415, f"Unsupported file type. Use one of: {', '.join(sorted(ALLOWED_SUFFIXES))}.")

    data = _read_limited(file, MAX_UPLOAD_BYTES)

    with tempfile.TemporaryDirectory() as workdir:
        path = Path(workdir) / f"upload{suffix}"
        path.write_bytes(data)
        vocals, sample_rate = separate_vocals(path)

    lead_audio, backing_audio = split_backing(vocals, sample_rate)
    lead = summarize_line(lead_audio, sample_rate, name="Lead vocal")
    if lead is None:
        raise HTTPException(422, "Couldn't find enough clear singing in this recording.")
    # Harmony lines share the lead's key so every part's sol-fa has the same doh.
    solfa = lead.get("solfa")
    backing = backing_lines(backing_audio, sample_rate, solfa["tonic"], solfa["mode"]) if solfa else []
    return {"lines": [lead, *backing]}


@app.post("/analyze-score")
def analyze_score(file: UploadFile = File(...), rights_confirmed: bool = Form(False)) -> dict:
    if not rights_confirmed:
        raise HTTPException(400, "Please confirm you have the right to use this score.")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SCORE_SUFFIXES:
        raise HTTPException(415, "Upload the score as MusicXML (.musicxml, .xml or .mxl).")

    data = _read_limited(file, MAX_SCORE_BYTES)
    with tempfile.TemporaryDirectory() as workdir:
        path = Path(workdir) / f"score{suffix}"
        path.write_bytes(data)
        try:
            lines = summarize_score(path)
        except Exception as error:  # music21 raises many parser-specific types
            raise HTTPException(422, "Couldn't read this score. Check it is valid MusicXML.") from error

    if not lines:
        raise HTTPException(422, "This score has no notes to analyse.")
    return {"lines": lines}
