from perfectpath_server.harmony import assign_lines, count_voices, tidy


def chord(pitches, start, length=1.0):
    return [(p, start, length) for p in pitches]


def test_splits_three_part_chords_into_high_middle_low():
    notes = chord([72, 67, 64], 0) + chord([74, 67, 65], 1) + chord([72, 69, 64], 2)
    assert count_voices(notes) == 3
    high, middle, low = assign_lines(notes, 3)
    assert [p for p, _, _ in high] == [72, 74, 72]
    assert [p for p, _, _ in middle] == [67, 67, 69]
    assert [p for p, _, _ in low] == [64, 65, 64]


def test_lone_notes_go_to_the_nearest_line():
    notes = chord([72, 60], 0) + chord([71], 1) + chord([59], 2)
    high, low = assign_lines(notes, 2)
    assert [p for p, _, _ in high] == [72, 71]
    assert [p for p, _, _ in low] == [60, 59]


def test_no_notes_means_no_lines():
    assert count_voices([]) == 0


def test_tidy_drops_stray_notes():
    line = [(60 + i % 3, i * 0.5, 0.5) for i in range(30)] + [(86, 20.0, 0.2)]
    assert max(p for p, _, _ in tidy(line)) == 62
