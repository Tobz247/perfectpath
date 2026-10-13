"""Pulls the vocals out of a mixed song with Demucs."""

from functools import lru_cache
from pathlib import Path

import numpy as np


@lru_cache(maxsize=1)
def _separator():
    # Imported lazily: torch is heavy and the model downloads on first use.
    from demucs.api import Separator

    return Separator(model="htdemucs")


def separate_vocals(path: Path) -> tuple[np.ndarray, int]:
    """Returns the isolated vocal stem as mono float32 audio and its sample rate."""
    separator = _separator()
    _, stems = separator.separate_audio_file(path)
    vocals = stems["vocals"].mean(dim=0).cpu().numpy().astype(np.float32)
    return vocals, separator.samplerate
