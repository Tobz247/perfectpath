"""Reads each part's range straight from a MusicXML score (choir mode)."""

from collections import defaultdict
from pathlib import Path

import numpy as np
from music21 import chord, converter, stream


def _weighted_percentile(values: np.ndarray, weights: np.ndarray, q: float) -> float:
    order = np.argsort(values)
    values, weights = values[order], weights[order]
    cumulative = np.cumsum(weights) / weights.sum()
    return float(values[np.searchsorted(cumulative, q / 100)])


def _summarize(name: str, notes: list[tuple[int, float]]) -> dict:
    midi = np.array([m for m, _ in notes], dtype=float)
    # Grace notes have no length; give them a token weight so they still count.
    weights = np.array([max(d, 0.01) for _, d in notes])
    return {
        "name": name,
        "low": int(midi.min()),
        "high": int(midi.max()),
        "tessitura": {
            "low": int(round(_weighted_percentile(midi, weights, 10))),
            "high": int(round(_weighted_percentile(midi, weights, 90))),
        },
    }


def summarize_score(path: Path) -> list[dict]:
    """Returns one vocal line per part, splitting staves that carry two voices.

    A staff written with separate voices (e.g. soprano and alto on one treble
    staff) becomes one line per voice; a staff written in chords becomes an
    upper and a lower line.
    """
    score = converter.parse(str(path))
    lines = []
    for index, part in enumerate(score.parts):
        part_name = (part.partName or "").strip() or f"Part {index + 1}"
        groups: dict[str, list[tuple[int, float]]] = defaultdict(list)
        for element in part.recurse().notes:
            voice = element.getContextByClass(stream.Voice)
            key = f"voice {voice.id}" if voice is not None else ""
            duration = float(element.quarterLength)
            if isinstance(element, chord.Chord):
                pitches = sorted(p.midi for p in element.pitches)
                if len(pitches) > 1:
                    groups[f"{key} upper".strip()].append((pitches[-1], duration))
                    groups[f"{key} lower".strip()].append((pitches[0], duration))
                    continue
                groups[key].append((pitches[0], duration))
            else:
                groups[key].append((element.pitch.midi, duration))

        groups = {k: v for k, v in groups.items() if v}
        for key in sorted(groups):
            name = part_name if len(groups) == 1 or not key else f"{part_name} ({key})"
            lines.append(_summarize(name, groups[key]))
    return lines
