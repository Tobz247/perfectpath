import { describe, expect, it } from 'vitest';
import { midiToFreq } from '../pitch/notes';
import { matchParts } from '../range/match';
import { RangeTracker } from '../range/rangeTracker';
import type { SingerRange, VocalLine } from '../range/types';
import { rankVoiceTypes } from '../range/voiceType';

describe('RangeTracker', () => {
  it('reports held notes and ignores brief glitches and low confidence', () => {
    const tracker = new RangeTracker({ minFramesPerNote: 3 });
    for (const note of [48, 50, 52, 55, 60, 64, 67]) {
      for (let i = 0; i < 3; i++) tracker.add({ frequency: midiToFreq(note), confidence: 0.95 });
    }
    tracker.add({ frequency: midiToFreq(80), confidence: 0.95 }); // one-frame glitch
    tracker.add({ frequency: midiToFreq(30), confidence: 0.4 }); // unclear frame
    expect(tracker.result()).toEqual({ low: 48, high: 67, comfortable: { low: 50, high: 65 } });
  });

  it('returns null before any note is held', () => {
    expect(new RangeTracker().result()).toBeNull();
  });
});

describe('rankVoiceTypes', () => {
  it('picks a sensible voice type', () => {
    expect(rankVoiceTypes({ low: 48, high: 72 })[0].type).toBe('Tenor');
    expect(rankVoiceTypes({ low: 41, high: 62 })[0].type).toBe('Bass');
    expect(rankVoiceTypes({ low: 60, high: 83 })[0].type).toBe('Soprano');
  });
});

describe('matchParts', () => {
  const baritone: SingerRange = { low: 45, high: 67, comfortable: { low: 48, high: 64 } };
  const line = (name: string, low: number, high: number): VocalLine => ({
    name,
    low,
    high,
    tessitura: { low: low + 2, high: high - 2 },
  });

  it('ranks the line that fits best first, in the original key', () => {
    const [best] = matchParts(baritone, [line('Lead', 55, 74), line('Low harmony', 47, 63)]);
    expect(best.line.name).toBe('Low harmony');
    expect(best.transpose).toBe(0);
  });

  it('suggests a key change when the line sits too high', () => {
    const [best] = matchParts(baritone, [line('Lead', 52, 71)]);
    expect(best.transpose).toBeLessThan(0);
    expect(best.line.high + best.transpose).toBeLessThanOrEqual(baritone.high);
  });
});
