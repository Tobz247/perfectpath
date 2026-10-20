import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioManager, AudioRecorder } from 'react-native-audio-api';
import { detectPitch, type PitchEstimate } from '../pitch/yin';

export type MicStatus = 'idle' | 'listening' | 'denied' | 'error';

/**
 * Streams the microphone and runs pitch detection on each buffer.
 * `onPitch` is called for every frame, including silent ones (null).
 */
export function useLivePitch(onPitch: (estimate: PitchEstimate | null) => void) {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const onPitchRef = useRef(onPitch);
  onPitchRef.current = onPitch;
  const [status, setStatus] = useState<MicStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(async () => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      recorder.clearOnAudioReady();
      await recorder.stop();
    }
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const permission = await AudioManager.requestRecordingPermissions();
    if (permission !== 'Granted') {
      setStatus('denied');
      return;
    }
    AudioManager.setAudioSessionOptions({ iosCategory: 'playAndRecord', iosMode: 'measurement' });

    const recorder = new AudioRecorder();
    recorder.onAudioReady({ sampleRate: 44100, bufferLength: 2048, channelCount: 1 }, ({ buffer }) => {
      onPitchRef.current(detectPitch(halve(buffer.getChannelData(0)), buffer.sampleRate / 2));
    });
    recorder.onError((event) => {
      setError(event.message);
      setStatus('error');
    });

    const started = await recorder.start();
    if (started.status === 'error') {
      setError(started.message);
      setStatus('error');
      return;
    }
    recorderRef.current = recorder;
    setStatus('listening');
  }, []);

  useEffect(() => () => void stop(), [stop]);

  return { status, error, start, stop };
}

/**
 * Halves the sample rate by averaging sample pairs. YIN's cost grows with the
 * square of the frame length, and at full rate it kept the JS thread so busy
 * that button taps were never handled. 22 kHz is still plenty for singing.
 */
function halve(samples: Float32Array): Float32Array {
  const out = new Float32Array(samples.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = (samples[2 * i] + samples[2 * i + 1]) / 2;
  return out;
}
