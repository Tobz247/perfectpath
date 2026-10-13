import { describe, expect, it } from 'vitest';
import { centsOff, freqToMidi, midiToName } from '../pitch/notes';
import { detectPitch } from '../pitch/yin';

const SAMPLE_RATE = 44100;

function tone(frequency: number, length = 2048, harmonics = [1, 0.5, 0.25]): Float32Array {
  const frame = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    harmonics.forEach((amp, h) => {
      frame[i] += 0.3 * amp * Math.sin((2 * Math.PI * frequency * (h + 1) * i) / SAMPLE_RATE);
    });
  }
  return frame;
}

describe('notes', () => {
  it('names notes', () => {
    expect(midiToName(60)).toBe('C4');
    expect(midiToName(69)).toBe('A4');
    expect(midiToName(40)).toBe('E2');
    expect(midiToName(freqToMidi(440))).toBe('A4');
  });

  it('measures cents', () => {
    expect(centsOff(freqToMidi(440 * Math.pow(2, 20 / 1200)))).toBe(20);
  });
});

describe('detectPitch', () => {
  it.each([82.41, 130.81, 220, 261.63, 440, 880])('finds %f Hz within 10 cents', (frequency) => {
    const estimate = detectPitch(tone(frequency), SAMPLE_RATE);
    expect(estimate).not.toBeNull();
    const cents = 1200 * Math.log2(estimate!.frequency / frequency);
    expect(Math.abs(cents)).toBeLessThan(10);
    expect(estimate!.confidence).toBeGreaterThan(0.9);
  });

  it('ignores silence', () => {
    expect(detectPitch(new Float32Array(2048), SAMPLE_RATE)).toBeNull();
  });

  it('ignores noise', () => {
    let seed = 1;
    const noise = Float32Array.from({ length: 2048 }, () => {
      seed = (seed * 16807) % 2147483647;
      return (seed / 2147483647 - 0.5) * 0.5;
    });
    expect(detectPitch(noise, SAMPLE_RATE)).toBeNull();
  });
});
