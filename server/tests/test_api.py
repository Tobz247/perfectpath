import io

import numpy as np
import pytest
from fastapi.testclient import TestClient

from perfectpath_server import app as app_module

SR = 22050


def sung_line(notes: list[int], seconds_per_note: float = 1.0) -> np.ndarray:
    """A synthetic 'voice': harmonic tones on the given MIDI notes."""
    chunks = []
    for note in notes:
        freq = 440 * 2 ** ((note - 69) / 12)
        t = np.arange(int(SR * seconds_per_note)) / SR
        chunks.append(sum(0.3 / h * np.sin(2 * np.pi * freq * h * t) for h in (1, 2, 3)))
    return np.concatenate(chunks).astype(np.float32)


@pytest.fixture
def client(monkeypatch):
    line = sung_line([55, 57, 59, 60, 62, 64, 62, 60, 59, 57, 55, 67])
    monkeypatch.setattr(app_module, "separate_vocals", lambda path: (line, SR))
    monkeypatch.setattr(app_module, "split_backing", lambda vocals, sr: (vocals, np.zeros_like(vocals)))
    monkeypatch.setattr(app_module, "backing_lines", lambda audio, sr, tonic, mode: [{"name": "Backing (high)", "key": (tonic, mode)}])
    return TestClient(app_module.app)


def upload(client, name="song.mp3", confirmed=True):
    return client.post(
        "/analyze",
        files={"file": (name, io.BytesIO(b"fake audio"), "audio/mpeg")},
        data={"rights_confirmed": str(confirmed).lower()},
    )


def test_summarizes_the_lead_vocal(client):
    response = upload(client)
    assert response.status_code == 200
    line, backing = response.json()["lines"]
    assert line["name"] == "Lead vocal"
    # Backing lines are written in the lead's key.
    assert backing == {"name": "Backing (high)", "key": [line["solfa"]["tonic"], line["solfa"]["mode"]]}
    assert line["low"] == 55
    assert line["high"] == 67
    assert 55 <= line["tessitura"]["low"] <= line["tessitura"]["high"] <= 67
    syllables = [n["syllable"] for p in line["solfa"]["phrases"] for n in p]
    assert line["solfa"]["doh"] == "G"
    assert syllables[:6] == ["d", "r", "m", "f", "s", "l"]


def test_requires_rights_confirmation(client):
    assert upload(client, confirmed=False).status_code == 400


def test_rejects_unknown_file_types(client):
    assert upload(client, name="notes.txt").status_code == 415


def test_reports_when_there_is_no_singing(monkeypatch):
    monkeypatch.setattr(app_module, "separate_vocals", lambda path: (np.zeros(SR * 5, dtype=np.float32), SR))
    monkeypatch.setattr(app_module, "split_backing", lambda vocals, sr: (vocals, vocals))
    assert upload(TestClient(app_module.app)).status_code == 422


def test_song_jobs_report_progress_and_return_the_lines(client):
    response = client.post(
        "/jobs",
        files={"file": ("song.mp3", io.BytesIO(b"fake audio"), "audio/mpeg")},
        data={"rights_confirmed": "true"},
    )
    assert response.status_code == 200
    job_id = response.json()["id"]
    app_module._worker.submit(lambda: None).result()  # wait for the job to finish
    job = client.get(f"/jobs/{job_id}").json()
    assert job["done"] and job["error"] is None
    assert job["steps"] == app_module.SONG_STEPS and job["step"] == 2
    assert [line["name"] for line in job["lines"]] == ["Lead vocal", "Backing (high)"]
    # Finished jobs are only handed out once.
    assert client.get(f"/jobs/{job_id}").status_code == 404
