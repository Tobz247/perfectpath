/** Ranges are MIDI note numbers (C4 = 60). */
export interface NoteRange {
  low: number;
  high: number;
}

export interface SingerRange extends NoteRange {
  /** The middle of the range, where the singer is comfortable for long stretches. */
  comfortable: NoteRange;
}

export interface SolfaNote {
  midi: number;
  /** Movable-doh name with octave marks, e.g. "s", "d¹", "t₁". */
  syllable: string;
}

export interface Solfa {
  /** Note name of doh, e.g. "G". */
  doh: string;
  /** Detected key, e.g. "E minor" (minor keys use lah-based minor). */
  key: string;
  phrases: SolfaNote[][];
}

export interface VocalLine extends NoteRange {
  name: string;
  /** Where the line sits most of the time (e.g. 10th to 90th percentile of its notes). */
  tessitura: NoteRange;
  /** Missing on results saved before sol-fa existed. */
  solfa?: Solfa | null;
}
