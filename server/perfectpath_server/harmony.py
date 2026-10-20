"""Splits the backing vocals into harmony lines (high, middle, low).

Backing singers sing chords, so a single-pitch tracker can't follow them.
Basic Pitch hears several notes at once; each note is then given to a line by
where it sits in the chord it belongs to, the same way choir scores written in
chords are split.
"""

import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

from .score import summarize_notes
from .solfa import Note, fix_octave_jumps

# Bass to soprano; anything outside is a separation artefact.
LOWEST, HIGHEST = 40, 86
MIN_AMPLITUDE = 0.3
MIN_NOTE_SECONDS = 0.12
MIN_LINE_SECONDS = 4.0
NAMES = {
    1: ["Backing vocal"],
    2: ["Backing (high)", "Backing (low)"],
    3: ["Backing (high)", "Backing (middle)", "Backing (low)"],
}


def transcribe(audio: np.ndarray, sample_rate: int) -> list[Note]:
    """Every note Basic Pitch hears in the backing vocals, as (MIDI, start, length)."""
    from basic_pitch.inference import predict  # heavy import, only when needed

    with tempfile.TemporaryDirectory() as workdir:
        path = Path(workdir) / "backing.wav"
        sf.write(path, audio, sample_rate)
        _, _, events = predict(path)
    return sorted(
        (int(pitch), float(start), float(end - start))
        for start, end, pitch, amplitude, _ in events
        if LOWEST <= pitch <= HIGHEST and amplitude >= MIN_AMPLITUDE and end - start >= MIN_NOTE_SECONDS
    )


def count_voices(notes: list[Note], step: float = 0.05) -> int:
    """How many harmony lines are usually sounding at once (1 to 3)."""
    if not notes:
        return 0
    end = max(start + length for _, start, length in notes)
    times = np.arange(0, end, step)
    active = np.array([sum(start <= t < start + length for _, start, length in notes) for t in times])
    sounding = active[active > 0]
    return int(np.clip(round(np.percentile(sounding, 75)), 1, 3)) if len(sounding) else 0


def assign_lines(notes: list[Note], voices: int) -> list[list[Note]]:
    """Gives each note to a line by its place in the chord around it (line 0 is the top)."""
    lines: list[list[Note]] = [[] for _ in range(voices)]
    if voices == 0:
        return lines
    pitches = np.array([p for p, _, _ in notes])
    # Where each line usually sits, for notes sung without a chord around them.
    centres = [float(np.percentile(pitches, 100 * (voices - i - 0.5) / voices)) for i in range(voices)]
    for note in notes:
        pitch, start, length = note
        middle = start + length / 2
        chord = sorted((p for p, s, l in notes if s <= middle < s + l), reverse=True)
        if len(chord) > 1:
            index = round(chord.index(pitch) * (voices - 1) / (len(chord) - 1))
        else:
            index = int(np.argmin([abs(pitch - c) for c in centres]))
        lines[index].append(note)
    return lines


def tidy(line: list[Note]) -> list[Note]:
    """Fixes octave slips and drops stray notes far outside where the line sings."""
    line = fix_octave_jumps(sorted(line, key=lambda n: n[1]))
    pitches = np.array([p for p, _, _ in line])
    low, high = np.percentile(pitches, [5, 95])
    return [n for n in line if low - 2 <= n[0] <= high + 2]


def backing_lines(audio: np.ndarray, sample_rate: int, tonic: int, mode: str) -> list[dict]:
    """Harmony lines in the backing vocals, each summarised like a choir part."""
    notes = transcribe(audio, sample_rate)
    voices = count_voices(notes)
    result = []
    for name, line in zip(NAMES.get(voices, []), assign_lines(notes, voices)):
        if sum(length for _, _, length in line) >= MIN_LINE_SECONDS:
            result.append(summarize_notes(name, tidy(line), tonic, mode))
    return result
