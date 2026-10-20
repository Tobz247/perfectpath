import numpy as np

from perfectpath_server.separation import loudest_window

SR = 100


def test_picks_the_loudest_stretch():
    audio = np.full((2, SR * 10), 0.1, dtype=np.float32)
    audio[:, SR * 6 : SR * 9] = 1.0
    assert loudest_window(audio, SR, 3) == (SR * 6, SR * 9)


def test_keeps_short_songs_whole():
    audio = np.zeros((2, SR * 2), dtype=np.float32)
    assert loudest_window(audio, SR, 3) == (0, SR * 2)
