export interface PitchEstimate {
  frequency: number;
  /** 0 to 1; how periodic the frame is. Low values are noise or breath. */
  confidence: number;
}

export interface YinOptions {
  threshold?: number;
  minFrequency?: number;
  maxFrequency?: number;
  /** Frames quieter than this RMS level are treated as silence. */
  silenceRms?: number;
}

/**
 * Estimates the fundamental frequency of one mono audio frame using the YIN
 * algorithm (de Cheveigné & Kawahara, 2002). Returns null for silence or
 * frames without a clear pitch.
 */
export function detectPitch(
  frame: Float32Array,
  sampleRate: number,
  { threshold = 0.15, minFrequency = 60, maxFrequency = 1500, silenceRms = 0.01 }: YinOptions = {},
): PitchEstimate | null {
  let energy = 0;
  for (let i = 0; i < frame.length; i++) energy += frame[i] * frame[i];
  if (Math.sqrt(energy / frame.length) < silenceRms) return null;

  const tauMin = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const tauMax = Math.min(Math.floor(sampleRate / minFrequency), Math.floor(frame.length / 2));
  if (tauMax <= tauMin) return null;
  const window = frame.length - tauMax;

  // Cumulative mean normalised difference function.
  const cmnd = new Float32Array(tauMax + 1);
  cmnd[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    let diff = 0;
    for (let j = 0; j < window; j++) {
      const delta = frame[j] - frame[j + tau];
      diff += delta * delta;
    }
    runningSum += diff;
    cmnd[tau] = runningSum === 0 ? 1 : (diff * tau) / runningSum;
  }

  let tau = -1;
  for (let t = tauMin; t < tauMax; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 < tauMax && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) return null;

  // Parabolic interpolation around the dip for sub-sample accuracy.
  const prev = cmnd[tau - 1];
  const next = cmnd[tau + 1];
  const denom = prev + next - 2 * cmnd[tau];
  const refinedTau = denom === 0 ? tau : tau + (prev - next) / (2 * denom);

  return { frequency: sampleRate / refinedTau, confidence: 1 - cmnd[tau] };
}
