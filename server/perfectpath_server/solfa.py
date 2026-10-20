"""Writes a vocal line in tonic sol-fa (movable doh).

The line is cut into held notes, the key is estimated from how long each pitch
class is sung, and every note is named relative to doh. Minor keys use
lah-based minor, so doh is the relative major, as in most choir sol-fa.
"""

import numpy as np

NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
# Semitones above doh, chromatic notes named the way choirs usually sing them.
SYLLABLES = ["d", "de", "r", "ri", "m", "f", "fe", "s", "se", "l", "ta", "t"]

# Krumhansl-Kessler key profiles, starting on the tonic.
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

MIN_NOTE_SECONDS = 0.12
# A repeat of the same pitch after a break this short is a wobble, not a new note.
MERGE_GAP_SECONDS = 0.06
PHRASE_GAP_SECONDS = 0.6
MAX_PHRASE_NOTES = 16

# A held note: (MIDI note, start in seconds, length in seconds).
Note = tuple[int, float, float]


SMOOTH_SECONDS = 0.1
# A note this far from its neighbours is almost always the tracker jumping an octave.
OCTAVE_JUMP_SEMITONES = 8


def smooth_track(midi: np.ndarray, hop_seconds: float) -> np.ndarray:
    """Median-smooths voiced frames so vibrato and scoops don't split one note into many."""
    half = max(1, int(SMOOTH_SECONDS / hop_seconds / 2))
    out = midi.copy()
    for i in np.flatnonzero(~np.isnan(midi)):
        out[i] = np.nanmedian(midi[max(0, i - half) : i + half + 1])
    return out


def fix_octave_jumps(notes: list[Note]) -> list[Note]:
    """Moves notes that leap an octave away from their neighbours back into line."""
    fixed = []
    for i, (pitch, start, length) in enumerate(notes):
        neighbours = [p for p, _, _ in notes[max(0, i - 3) : i] + notes[i + 1 : i + 4]]
        if neighbours:
            centre = float(np.median(neighbours))
            while pitch - centre > OCTAVE_JUMP_SEMITONES:
                pitch -= 12
            while centre - pitch > OCTAVE_JUMP_SEMITONES:
                pitch += 12
        fixed.append((pitch, start, length))
    return fixed


def notes_from_track(midi: np.ndarray, hop_seconds: float) -> list[Note]:
    """Held notes from a raw pitch track (NaN where unvoiced)."""
    return fix_octave_jumps(segment_notes(smooth_track(midi, hop_seconds), hop_seconds))


def segment_notes(midi: np.ndarray, hop_seconds: float) -> list[Note]:
    """Groups a frame-by-frame pitch track (NaN where unvoiced) into held notes."""
    rounded = np.round(midi)
    notes: list[Note] = []
    start = 0
    for i in range(1, len(rounded) + 1):
        if i < len(rounded) and rounded[i] == rounded[start]:
            continue
        length = (i - start) * hop_seconds
        if not np.isnan(rounded[start]) and length >= MIN_NOTE_SECONDS:
            pitch = int(rounded[start])
            begin = start * hop_seconds
            if notes and notes[-1][0] == pitch and begin - (notes[-1][1] + notes[-1][2]) < MERGE_GAP_SECONDS:
                _, prev_start, _ = notes.pop()
                notes.append((pitch, prev_start, begin + length - prev_start))
            else:
                notes.append((pitch, begin, length))
        start = i
    return notes


def detect_key(notes: list[tuple[int, float]]) -> tuple[int, str]:
    """Best (tonic pitch class, 'major' or 'minor') for (MIDI note, weight) pairs."""
    histogram = np.zeros(12)
    for pitch, weight in notes:
        histogram[pitch % 12] += weight
    best = (-2.0, 0, "major")
    for tonic in range(12):
        rotated = np.roll(histogram, -tonic)
        for mode, profile in (("major", MAJOR_PROFILE), ("minor", MINOR_PROFILE)):
            score = float(np.corrcoef(rotated, profile)[0, 1]) if rotated.std() > 0 else -1.0
            if score > best[0]:
                best = (score, tonic, mode)
    return best[1], best[2]


def doh_of(tonic: int, mode: str) -> int:
    return (tonic + 3) % 12 if mode == "minor" else tonic


def syllable(pitch: int, doh: int, middle_octave: int) -> str:
    """Sol-fa name with octave marks: d¹ is an octave above the middle, d₁ an octave below."""
    degree = (pitch - doh) % 12
    octave = (pitch - doh) // 12 - middle_octave
    mark = "¹" * octave if octave > 0 else "₁" * -octave
    return SYLLABLES[degree] + mark


def to_solfa(notes: list[Note], tonic: int, mode: str) -> dict:
    """Sol-fa for held notes (in time order), split into phrases at rests."""
    doh = doh_of(tonic, mode)
    octaves = [(pitch - doh) // 12 for pitch, _, _ in notes]
    middle = int(np.median(octaves)) if octaves else 0

    phrases: list[list[dict]] = []
    last_end = None
    for pitch, start, length in notes:
        if last_end is None or start - last_end > PHRASE_GAP_SECONDS or len(phrases[-1]) >= MAX_PHRASE_NOTES:
            phrases.append([])
        phrases[-1].append({"midi": pitch, "syllable": syllable(pitch, doh, middle)})
        last_end = start + length
    return {"doh": NOTE_NAMES[doh], "key": f"{NOTE_NAMES[tonic]} {mode}", "tonic": tonic, "mode": mode, "phrases": phrases}


def solfa_for_notes(notes: list[Note]) -> dict | None:
    """Detects the key from the notes themselves and writes them in sol-fa."""
    if not notes:
        return None
    tonic, mode = detect_key([(pitch, length) for pitch, _, length in notes])
    return to_solfa(notes, tonic, mode)
