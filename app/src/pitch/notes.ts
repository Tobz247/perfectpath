const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Converts a frequency in Hz to a fractional MIDI note number (A4 = 69). */
export function freqToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / 440);
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Scientific pitch name for a MIDI note, e.g. 60 -> "C4". */
export function midiToName(midi: number): string {
  const rounded = Math.round(midi);
  const octave = Math.floor(rounded / 12) - 1;
  return `${NOTE_NAMES[((rounded % 12) + 12) % 12]}${octave}`;
}

/** How far a pitch sits from the nearest note, in cents (-50 to +50). */
export function centsOff(midi: number): number {
  return Math.round((midi - Math.round(midi)) * 100);
}
