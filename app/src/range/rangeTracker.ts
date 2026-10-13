import { freqToMidi } from '../pitch/notes';
import type { PitchEstimate } from '../pitch/yin';
import type { SingerRange } from './types';

export interface RangeTrackerOptions {
  /** A note only counts once it has been held for this many frames. */
  minFramesPerNote?: number;
  minConfidence?: number;
  /** Semitones trimmed from each end of the full range to give the comfortable range. */
  comfortMargin?: number;
}

/**
 * Collects pitch frames during the range test and reports the lowest and
 * highest notes the singer actually held, ignoring brief glitches.
 */
export class RangeTracker {
  private readonly counts = new Map<number, number>();
  private readonly minFrames: number;
  private readonly minConfidence: number;
  private readonly comfortMargin: number;

  constructor({ minFramesPerNote = 4, minConfidence = 0.8, comfortMargin = 2 }: RangeTrackerOptions = {}) {
    this.minFrames = minFramesPerNote;
    this.minConfidence = minConfidence;
    this.comfortMargin = comfortMargin;
  }

  add(estimate: PitchEstimate | null): void {
    if (!estimate || estimate.confidence < this.minConfidence) return;
    const note = Math.round(freqToMidi(estimate.frequency));
    this.counts.set(note, (this.counts.get(note) ?? 0) + 1);
  }

  reset(): void {
    this.counts.clear();
  }

  result(): SingerRange | null {
    const held = [...this.counts].filter(([, count]) => count >= this.minFrames).map(([note]) => note);
    if (held.length === 0) return null;
    const low = Math.min(...held);
    const high = Math.max(...held);
    const margin = high - low > 2 * this.comfortMargin ? this.comfortMargin : 0;
    return { low, high, comfortable: { low: low + margin, high: high - margin } };
  }
}
