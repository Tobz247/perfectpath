import { Vibration } from 'react-native';

/** A short tap of vibration, e.g. when a note locks in during the range test. */
export function tick(): void {
  Vibration.vibrate(15);
}
