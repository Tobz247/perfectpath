import type { NoteRange } from './types';

export type VoiceType = 'Soprano' | 'Mezzo-soprano' | 'Alto' | 'Tenor' | 'Baritone' | 'Bass';

/** Typical choral ranges in MIDI notes; real voices vary, so treat results as a guide. */
export const VOICE_TYPES: Record<VoiceType, NoteRange> = {
  Soprano: { low: 60, high: 84 }, // C4 to C6
  'Mezzo-soprano': { low: 57, high: 81 }, // A3 to A5
  Alto: { low: 53, high: 77 }, // F3 to F5
  Tenor: { low: 48, high: 72 }, // C3 to C5
  Baritone: { low: 45, high: 69 }, // A2 to A4
  Bass: { low: 40, high: 64 }, // E2 to E4
};

function overlap(a: NoteRange, b: NoteRange): number {
  return Math.max(0, Math.min(a.high, b.high) - Math.max(a.low, b.low));
}

/** Ranks voice types by how well they cover the singer's range, best first. */
export function rankVoiceTypes(range: NoteRange): { type: VoiceType; score: number }[] {
  const mid = (range.low + range.high) / 2;
  return (Object.entries(VOICE_TYPES) as [VoiceType, NoteRange][])
    .map(([type, typical]) => {
      const coverage = overlap(range, typical) / (typical.high - typical.low);
      const centreDistance = Math.abs(mid - (typical.low + typical.high) / 2);
      return { type, score: coverage - 0.05 * centreDistance };
    })
    .sort((a, b) => b.score - a.score);
}
