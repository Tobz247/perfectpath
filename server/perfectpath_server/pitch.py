"""Turns a single vocal line into a range summary the app can match against."""

import librosa
import numpy as np

from .solfa import notes_from_track, solfa_for_notes

# C2 to C6 covers bass through soprano.
FMIN = 65.0
FMAX = 1050.0
MIN_VOICED_SECONDS = 2.0


def summarize_line(audio: np.ndarray, sample_rate: int, name: str) -> dict | None:
    """Tracks pitch with pYIN and returns the line's range and tessitura as MIDI notes.

    The extremes use the 2nd and 98th percentiles so stray separation artefacts
    don't stretch the range; the tessitura uses the 10th to 90th percentiles.
    Returns None when there is too little clearly sung material.
    """
    f0, voiced, probability = librosa.pyin(audio, fmin=FMIN, fmax=FMAX, sr=sample_rate)
    confident = voiced & (probability > 0.5) & np.isfinite(f0)
    hop_seconds = 512 / sample_rate
    if confident.sum() * hop_seconds < MIN_VOICED_SECONDS:
        return None

    midi = librosa.hz_to_midi(f0[confident])
    low, tess_low, tess_high, high = np.round(np.percentile(midi, [2, 10, 90, 98])).astype(int).tolist()
    return {
        "name": name,
        "low": low,
        "high": high,
        "tessitura": {"low": tess_low, "high": tess_high},
        "voicedSeconds": round(float(confident.sum() * hop_seconds), 1),
        # pYIN's voicing decision is enough here: the stricter probability cut used
        # for the range drops most frames of real (separated) singing.
        "solfa": solfa_for_notes(notes_from_track(np.where(voiced & np.isfinite(f0), librosa.hz_to_midi(f0), np.nan), hop_seconds)),
    }
