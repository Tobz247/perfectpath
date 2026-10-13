import io

from fastapi.testclient import TestClient
from music21 import chord, note, stream

from perfectpath_server.app import app

client = TestClient(app)


def part(name: str, *elements) -> stream.Part:
    p = stream.Part()
    p.partName = name
    for element in elements:
        p.append(element)
    return p


def to_musicxml(score: stream.Score) -> bytes:
    return open(score.write("musicxml"), "rb").read()


def upload(data: bytes, name="anthem.musicxml", confirmed=True):
    return client.post(
        "/analyze-score",
        files={"file": (name, io.BytesIO(data), "application/xml")},
        data={"rights_confirmed": str(confirmed).lower()},
    )


def test_reads_each_part_range():
    score = stream.Score()
    score.insert(0, part("Soprano", note.Note("C5", quarterLength=4), note.Note("G5", quarterLength=1), note.Note("E4", quarterLength=0.25)))
    score.insert(0, part("Bass", note.Note("C3", quarterLength=2), note.Note("G2", quarterLength=2)))

    response = upload(to_musicxml(score))
    assert response.status_code == 200
    soprano, bass = response.json()["lines"]
    assert soprano == {"name": "Soprano", "low": 64, "high": 79, "tessitura": {"low": 72, "high": 79}}
    assert bass["name"] == "Bass" and (bass["low"], bass["high"]) == (43, 48)


def test_splits_a_chorded_staff_into_upper_and_lower_lines():
    score = stream.Score()
    score.insert(0, part("Women", chord.Chord(["A4", "E5"], quarterLength=2), chord.Chord(["G4", "D5"], quarterLength=2)))

    names = {line["name"]: (line["low"], line["high"]) for line in upload(to_musicxml(score)).json()["lines"]}
    assert names == {"Women (upper)": (74, 76), "Women (lower)": (67, 69)}


def test_rejects_audio_files_and_unconfirmed_uploads():
    assert upload(b"x", name="song.mp3").status_code == 415
    assert upload(b"x", confirmed=False).status_code == 400


def test_reports_unreadable_scores():
    assert upload(b"<not musicxml").status_code == 422
