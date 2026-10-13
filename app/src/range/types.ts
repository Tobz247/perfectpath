/** Ranges are MIDI note numbers (C4 = 60). */
export interface NoteRange {
  low: number;
  high: number;
}

export interface SingerRange extends NoteRange {
  /** The middle of the range, where the singer is comfortable for long stretches. */
  comfortable: NoteRange;
}

export interface VocalLine extends NoteRange {
  name: string;
  /** Where the line sits most of the time (e.g. 10th to 90th percentile of its notes). */
  tessitura: NoteRange;
}
