"""Pulls the vocals out of a mixed song with Demucs."""

import tempfile
from functools import lru_cache
from pathlib import Path

import numpy as np
import soundfile as sf

# Demucs is slow without a GPU, so only the busiest stretch of a song is
# separated. Choruses are usually the loudest part and hold the widest range.
EXCERPT_SECONDS = 90
# Karaoke model that splits a vocal stem into the lead singer and everyone else.
# The MDX-Net ONNX model is the quickest of these on a CPU.
KARAOKE_MODEL = "UVR_MDXNET_KARA_2.onnx"
MODEL_DIR = Path.home() / ".cache" / "perfectpath" / "models"


@lru_cache(maxsize=1)
def _separator():
    # Imported lazily: torch is heavy and the model downloads on first use.
    from demucs.api import Separator

    return Separator(model="htdemucs")


def loudest_window(audio: np.ndarray, sample_rate: int, seconds: float) -> tuple[int, int]:
    """Start and end sample of the loudest `seconds`-long stretch of (channels, samples) audio."""
    total = audio.shape[-1]
    length = int(seconds * sample_rate)
    if total <= length:
        return 0, total
    mono = audio.reshape(-1, total).mean(axis=0)
    # Energy per one-second block, then the best run of blocks.
    block = sample_rate
    blocks = total // block
    energy = (mono[: blocks * block].reshape(blocks, block) ** 2).sum(axis=1)
    span = length // block
    sums = np.convolve(energy, np.ones(span), mode="valid")
    start = int(np.argmax(sums)) * block
    return start, start + length


def separate_vocals(path: Path) -> tuple[np.ndarray, int]:
    """Returns the isolated vocal stem as mono float32 audio and its sample rate."""
    separator = _separator()
    wav = separator._load_audio(path)
    start, end = loudest_window(wav.numpy(), separator.samplerate, EXCERPT_SECONDS)
    _, stems = separator.separate_tensor(wav[:, start:end], separator.samplerate)
    vocals = stems["vocals"].mean(dim=0).cpu().numpy().astype(np.float32)
    return vocals, separator.samplerate


def split_backing(vocals: np.ndarray, sample_rate: int) -> tuple[np.ndarray, np.ndarray]:
    """Splits a vocal stem into (lead, backing) mono audio at the same sample rate."""
    from audio_separator.separator import Separator  # heavy import, only when needed

    with tempfile.TemporaryDirectory() as workdir:
        source = Path(workdir) / "vocals.wav"
        sf.write(source, vocals, sample_rate)
        separator = Separator(output_dir=workdir, model_file_dir=str(MODEL_DIR), sample_rate=sample_rate)
        separator.load_model(KARAOKE_MODEL)
        separator.separate(str(source))
        # The karaoke model calls the lead "Vocals" and the rest "Instrumental".
        lead = next(Path(workdir).glob("*(Vocals)*"))
        backing = next(Path(workdir).glob("*(Instrumental)*"))
        return _mono(lead), _mono(backing)


def _mono(path: Path) -> np.ndarray:
    audio, _ = sf.read(path, dtype="float32")
    return audio.mean(axis=1) if audio.ndim == 2 else audio
