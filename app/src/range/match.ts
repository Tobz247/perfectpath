import type { SingerRange, VocalLine } from './types';

export interface PartMatch {
  line: VocalLine;
  /** Semitones to move the song so this line suits the singer (negative = lower). */
  transpose: number;
  /** 0 to 1; share of the line's usual notes inside the singer's comfortable range, less penalties. */
  score: number;
}

const MAX_TRANSPOSE = 6;

function scoreLine(singer: SingerRange, line: VocalLine, shift: number): number {
  const tessLow = line.tessitura.low + shift;
  const tessHigh = line.tessitura.high + shift;
  const width = Math.max(1, tessHigh - tessLow);
  const inside = Math.max(0, Math.min(tessHigh, singer.comfortable.high) - Math.max(tessLow, singer.comfortable.low));
  const fit = Math.min(1, inside / width);

  const tooLow = Math.max(0, singer.low - (line.low + shift));
  const tooHigh = Math.max(0, line.high + shift - singer.high);
  // Prefer the original key when two options fit about equally.
  return fit - 0.25 * (tooLow + tooHigh) - 0.02 * Math.abs(shift);
}

/** For each vocal line, finds the key shift that best suits the singer; best line first. */
export function matchParts(singer: SingerRange, lines: VocalLine[]): PartMatch[] {
  return lines
    .map((line) => {
      let best: PartMatch = { line, transpose: 0, score: scoreLine(singer, line, 0) };
      for (let shift = -MAX_TRANSPOSE; shift <= MAX_TRANSPOSE; shift++) {
        const score = scoreLine(singer, line, shift);
        if (score > best.score) best = { line, transpose: shift, score };
      }
      return { ...best, score: Math.max(0, best.score) };
    })
    .sort((a, b) => b.score - a.score);
}
