import numpy as np

from perfectpath_server.solfa import detect_key, fix_octave_jumps, notes_from_track, segment_notes, solfa_for_notes, syllable, to_solfa

C_MAJOR_SCALE = [60, 62, 64, 65, 67, 69, 71, 72]


def held(pitches, seconds=0.5):
    return [(p, i * seconds, seconds) for i, p in enumerate(pitches)]


def test_names_notes_relative_to_doh():
    assert [syllable(p, 0, 5) for p in C_MAJOR_SCALE] == ["d", "r", "m", "f", "s", "l", "t", "d¹"]
    assert syllable(59, 0, 5) == "t₁"
    assert syllable(66, 0, 5) == "fe"


def test_detects_major_and_minor_keys():
    assert detect_key([(p, 1.0) for p in C_MAJOR_SCALE + [60, 67, 64]]) == (0, "major")
    a_minor = [57, 59, 60, 62, 64, 65, 68, 69, 57, 64, 60, 57]
    assert detect_key([(p, 1.0) for p in a_minor]) == (9, "minor")


def test_minor_keys_use_lah_based_minor():
    solfa = to_solfa(held([57, 60, 64]), tonic=9, mode="minor")
    assert solfa["doh"] == "C" and solfa["key"] == "A minor"
    assert [n["syllable"] for n in solfa["phrases"][0]] == ["l₁", "d", "m"]


def test_rests_split_phrases():
    notes = [(60, 0.0, 0.5), (62, 0.5, 0.5), (64, 2.0, 0.5)]
    phrases = to_solfa(notes, tonic=0, mode="major")["phrases"]
    assert [[n["syllable"] for n in p] for p in phrases] == [["d", "r"], ["m"]]


def test_segments_a_pitch_track_into_held_notes():
    hop = 0.01
    track = np.concatenate([np.full(30, 60.2), np.full(5, 61.0), np.full(30, 64.1), np.full(20, np.nan), np.full(30, 67.0)])
    assert [n[0] for n in segment_notes(track, hop)] == [60, 64, 67]


def test_gives_nothing_for_no_notes():
    assert solfa_for_notes([]) is None


def test_vibrato_stays_one_note():
    hop = 0.01
    wobble = 62 + 0.6 * np.sin(np.arange(60) * 2 * np.pi * 6 * hop)
    assert [n[0] for n in notes_from_track(wobble, hop)] == [62]


def test_pulls_octave_errors_back_into_line():
    notes = held([60, 62, 76, 65, 67])
    assert [n[0] for n in fix_octave_jumps(notes)] == [60, 62, 64, 65, 67]
