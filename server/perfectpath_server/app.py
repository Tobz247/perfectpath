"""PerfectPath analysis API.

Uploaded audio is analysed and then deleted; only the derived pitch summary is
returned. Separated stems are never stored or sent back (see the legal notes in
the README).
"""

import tempfile
import threading
import uuid
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
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


# The steps a song goes through, in order, so the app can show progress.
SONG_STEPS = ["Separating the voices", "Splitting lead and backing singers", "Reading the notes"]


def _check_song(file: UploadFile, rights_confirmed: bool) -> tuple[bytes, str]:
    if not rights_confirmed:
        raise HTTPException(400, "Please confirm you have the right to use this recording.")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(415, f"Unsupported file type. Use one of: {', '.join(sorted(ALLOWED_SUFFIXES))}.")
    return _read_limited(file, MAX_UPLOAD_BYTES), suffix


def analyse_song(data: bytes, suffix: str, report: Callable[[int], None] = lambda step: None) -> list[dict]:
    """Runs the whole song pipeline, calling `report` with the index of each step as it starts."""
    report(0)
    with tempfile.TemporaryDirectory() as workdir:
        path = Path(workdir) / f"upload{suffix}"
        path.write_bytes(data)
        vocals, sample_rate = separate_vocals(path)

    report(1)
    lead_audio, backing_audio = split_backing(vocals, sample_rate)
    report(2)
    lead = summarize_line(lead_audio, sample_rate, name="Lead vocal")
    if lead is None:
        raise HTTPException(422, "Couldn't find enough clear singing in this recording.")
    # Harmony lines share the lead's key so every part's sol-fa has the same doh.
    solfa = lead.get("solfa")
    backing = backing_lines(backing_audio, sample_rate, solfa["tonic"], solfa["mode"]) if solfa else []
    return [lead, *backing]


@app.post("/analyze")
def analyze(file: UploadFile = File(...), rights_confirmed: bool = Form(False)) -> dict:
    data, suffix = _check_song(file, rights_confirmed)
    return {"lines": analyse_song(data, suffix)}


# Song jobs run one at a time in the background (separation uses all the CPU and
# a lot of memory); the app polls for progress. Jobs live in memory only.
_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()
_worker = ThreadPoolExecutor(max_workers=1)


def _update(job_id: str, **changes) -> None:
    with _jobs_lock:
        _jobs[job_id].update(changes)


def _run_job(job_id: str, data: bytes, suffix: str) -> None:
    try:
        lines = analyse_song(data, suffix, lambda step: _update(job_id, step=step))
        _update(job_id, done=True, lines=lines)
    except HTTPException as error:
        _update(job_id, done=True, error=error.detail)
    except Exception:
        _update(job_id, done=True, error="Something went wrong while analysing this song.")


@app.post("/jobs")
def start_job(file: UploadFile = File(...), rights_confirmed: bool = Form(False)) -> dict:
    data, suffix = _check_song(file, rights_confirmed)
    job_id = uuid.uuid4().hex
    with _jobs_lock:
        _jobs[job_id] = {"step": -1, "steps": SONG_STEPS, "done": False, "error": None, "lines": None}
    _worker.submit(_run_job, job_id, data, suffix)
    return {"id": job_id}


@app.get("/jobs/{job_id}")
def job_status(job_id: str) -> dict:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job is None:
            raise HTTPException(404, "This analysis has expired. Please try again.")
        # Results are handed over once and then forgotten.
        if job["done"]:
            del _jobs[job_id]
        return dict(job)


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
