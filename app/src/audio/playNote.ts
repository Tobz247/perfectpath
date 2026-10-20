import { AudioContext } from 'react-native-audio-api';
import { midiToFreq } from '../pitch/notes';

let context: AudioContext | null = null;

/** Plays a short soft tone for a MIDI note, so singers can hear a sol-fa note. */
export function playNote(midi: number, seconds = 0.9): void {
  context ??= new AudioContext();
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(midiToFreq(midi), now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + seconds);
}
