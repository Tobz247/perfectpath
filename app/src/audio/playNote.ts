import { AudioContext, type GainNode, type OscillatorNode } from 'react-native-audio-api';
import { midiToFreq } from '../pitch/notes';

let context: AudioContext | null = null;
const audio = () => (context ??= new AudioContext());

/**
 * A soft sung-like tone: a triangle wave with a gentle attack, a little vibrato
 * and a release, so a line of notes sounds like a voice humming it.
 */
function tone(midi: number, at: number, seconds: number): { oscillator: OscillatorNode; gain: GainNode } {
  const ctx = audio();
  const oscillator = ctx.createOscillator();
  const vibrato = ctx.createOscillator();
  const depth = ctx.createGain();
  const gain = ctx.createGain();
  const freq = midiToFreq(midi);
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(freq, at);
  vibrato.frequency.setValueAtTime(5.5, at);
  depth.gain.setValueAtTime(freq * 0.006, at);
  vibrato.connect(depth);
  depth.connect(oscillator.frequency);

  const release = Math.min(0.15, seconds / 3);
  gain.gain.setValueAtTime(0, at);
  gain.gain.linearRampToValueAtTime(0.3, at + 0.04);
  gain.gain.setValueAtTime(0.3, at + seconds - release);
  gain.gain.linearRampToValueAtTime(0, at + seconds);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(at);
  vibrato.start(at);
  oscillator.stop(at + seconds);
  vibrato.stop(at + seconds);
  return { oscillator, gain };
}

/** Plays one note, e.g. when a sol-fa syllable is tapped. */
export function playNote(midi: number, seconds = 0.9): void {
  tone(midi, audio().currentTime + 0.02, seconds);
}

export interface TimedNote {
  midi: number;
  /** Start and length in seconds, as sung in the recording (or beats for scores). */
  start?: number;
  length?: number;
}

export interface Playback {
  stop: () => void;
}

// Long rests in a song would leave silence, so gaps are shortened; very short
// or very long notes are kept within what is easy to hear and follow.
const MAX_GAP = 0.6;
const MIN_NOTE = 0.18;
const MAX_NOTE = 2.5;
const FALLBACK_NOTE = 0.5;

/**
 * Plays a line of notes in time, calling `onNote` with each note's index as it
 * sounds (and -1 at the end). `slower` stretches everything for practice.
 */
export function playLine(notes: TimedNote[], onNote: (index: number) => void, { secondsPerUnit = 1, slower = 1 } = {}): Playback {
  const ctx = audio();
  const begin = ctx.currentTime + 0.1;
  const scheduled: { oscillator: OscillatorNode; gain: GainNode }[] = [];
  const timers: ReturnType<typeof setTimeout>[] = [];

  let at = 0;
  let previousEnd: number | null = null;
  notes.forEach((note, index) => {
    const start = note.start !== undefined ? note.start * secondsPerUnit : null;
    const gap = start !== null && previousEnd !== null ? Math.min(MAX_GAP, Math.max(0, start - previousEnd)) : previousEnd === null ? 0 : 0.05;
    const length = Math.min(MAX_NOTE, Math.max(MIN_NOTE, note.length !== undefined ? note.length * secondsPerUnit : FALLBACK_NOTE));
    at += gap * slower;
    const seconds = length * slower;
    scheduled.push(tone(note.midi, begin + at, seconds));
    timers.push(setTimeout(() => onNote(index), (0.1 + at) * 1000));
    at += seconds;
    previousEnd = start !== null ? start + length : null;
  });
  timers.push(setTimeout(() => onNote(-1), (0.1 + at) * 1000));

  return {
    stop: () => {
      timers.forEach(clearTimeout);
      const now = ctx.currentTime;
      for (const { oscillator, gain } of scheduled) {
        gain.gain.setValueAtTime(0, now);
        try {
          oscillator.stop(now);
        } catch {
          // Already finished.
        }
      }
      onNote(-1);
    },
  };
}
