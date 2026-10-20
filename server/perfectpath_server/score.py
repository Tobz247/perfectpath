"""Reads each part's range straight from a MusicXML score (choir mode)."""

from collections import defaultdict
from pathlib import Path

import numpy as np
from music21 import chord, converter, stream
from music21 import key as m21key

from .solfa import Note, to_solfa


def _weighted_percentile(values: np.ndarray, weights: np.ndarray, q: float) -> float:
    order = np.argsort(values)
    values, weights = values[order], weights[order]
    cumulative = np.cumsum(weights) / weights.sum()
    return float(values[np.searchsorted(cumulative, q / 100)])


def summarize_notes(name: str, notes: list[Note], tonic: int, mode: str) -> dict:
    """Range, tessitura and sol-fa for a line of (MIDI, start, length) notes."""
    midi = np.array([m for m, _, _ in notes], dtype=float)
    # Grace notes have no length; give them a token weight so they still count.
    weights = np.array([max(d, 0.01) for _, _, d in notes])
    return {
        "name": name,
        "low": int(midi.min()),
        "high": int(midi.max()),
        "tessitura": {
            "low": int(round(_weighted_percentile(midi, weights, 10))),
            "high": int(round(_weighted_percentile(midi, weights, 90))),
        },
        # Scores give times in beats and recordings in seconds; either way a rest
        # of more than about half a beat or second ends a phrase.
        "solfa": to_solfa(sorted(notes, key=lambda n: n[1]), tonic, mode),
    }


def summarize_score(path: Path) -> list[dict]:
    """Returns one vocal line per part, splitting staves that carry two voices.

    A staff written with separate voices (e.g. soprano and alto on one treble
    staff) becomes one line per voice; a staff written in chords becomes an
    upper and a lower line.
    """
    score = converter.parse(str(path))
    # Trust the written key signature; the notes only decide major versus minor.
    detected = score.analyze("key")
    signature = next(iter(score.recurse().getElementsByClass(m21key.KeySignature)), None)
    if signature is not None and signature.sharps != detected.sharps:
        detected = signature.asKey(detected.mode if detected.mode == "minor" else "major")
    tonic, mode = detected.tonic.pitchClass, ("minor" if detected.mode == "minor" else "major")
    lines = []
    for index, part in enumerate(score.parts):
        part_name = (part.partName or "").strip() or f"Part {index + 1}"
        groups: dict[str, list[Note]] = defaultdict(list)
        for element in part.recurse().notes:
            voice = element.getContextByClass(stream.Voice)
            key = f"voice {voice.id}" if voice is not None else ""
            duration = float(element.quarterLength)
            offset = float(element.getOffsetInHierarchy(part))
            if isinstance(element, chord.Chord):
                pitches = sorted(p.midi for p in element.pitches)
                if len(pitches) > 1:
                    groups[f"{key} upper".strip()].append((pitches[-1], offset, duration))
                    groups[f"{key} lower".strip()].append((pitches[0], offset, duration))
                    continue
                groups[key].append((pitches[0], offset, duration))
            else:
                groups[key].append((element.pitch.midi, offset, duration))

        groups = {k: v for k, v in groups.items() if v}
        for key in sorted(groups):
            name = part_name if len(groups) == 1 or not key else f"{part_name} ({key})"
            lines.append(summarize_notes(name, groups[key], tonic, mode))
    return lines
