import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLivePitch } from '../audio/useLivePitch';
import { Button, colors } from '../components/ui';
import { centsOff, freqToMidi, midiToName } from '../pitch/notes';
import type { PitchEstimate } from '../pitch/yin';
import { RangeTracker } from '../range/rangeTracker';
import type { SingerRange } from '../range/types';
import { useSingerRange } from '../state/RangeContext';

const STEPS = [
  { title: 'Warm up', prompt: 'Hum a comfortable note in the middle of your voice for a few seconds.' },
  { title: 'Lowest note', prompt: 'Slide down slowly to the lowest note you can sing clearly, and hold it.' },
  { title: 'Highest note', prompt: "Now slide up to the highest note you can sing without straining, and hold it." },
];

export default function RangeTest() {
  const tracker = useRef(new RangeTracker());
  const [step, setStep] = useState(-1);
  const [current, setCurrent] = useState<number | null>(null);
  const [range, setRange] = useState<SingerRange | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const { saveRange } = useSingerRange();

  const handlePitch = useCallback((estimate: PitchEstimate | null) => {
    tracker.current.add(estimate);
    setCurrent(estimate && estimate.confidence >= 0.8 ? freqToMidi(estimate.frequency) : null);
    // Only re-render when the range actually changes, not on every frame.
    const next = tracker.current.result();
    setRange((prev) => (prev?.low === next?.low && prev?.high === next?.high ? prev : next));
  }, []);

  const mic = useLivePitch(handlePitch);

  const start = async () => {
    tracker.current.reset();
    setRange(null);
    setProblem(null);
    await mic.start();
    setStep(0);
  };

  const next = async () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    await mic.stop();
    const result = tracker.current.result();
    if (!result || result.high - result.low < 5) {
      setProblem("I didn't catch enough steady notes. Find a quieter spot, hold each note a little longer, and try again.");
      setStep(-1);
      return;
    }
    await saveRange(result);
    router.replace('/your-voice');
  };

  if (step === -1) {
    return (
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <Text style={styles.title}>Let's measure your voice</Text>
        <Text style={styles.prompt}>
          Find a quiet spot and hold your phone about an arm's length away. There are three short steps, and only notes
          you hold steadily count.
        </Text>
        {problem && <Text style={styles.error}>{problem}</Text>}
        {mic.status === 'denied' && <Text style={styles.error}>Microphone access is needed for the range test.</Text>}
        {mic.error && <Text style={styles.error}>{mic.error}</Text>}
        <Button title="Start" onPress={start} style={styles.bottom} />
      </SafeAreaView>
    );
  }

  const { title, prompt } = STEPS[step];
  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <Text style={styles.stepCount}>
        Step {step + 1} of {STEPS.length}
      </Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.prompt}>{prompt}</Text>

      <View style={styles.meter}>
        <Text style={styles.note}>{current === null ? '–' : midiToName(current)}</Text>
        <Text style={styles.cents}>
          {current === null ? 'Listening…' : `${centsOff(current) > 0 ? '+' : ''}${centsOff(current)} cents`}
        </Text>
        {range && (
          <Text style={styles.sofar}>
            So far: {midiToName(range.low)} to {midiToName(range.high)}
          </Text>
        )}
      </View>

      <Button title={step === STEPS.length - 1 ? 'Finish' : 'Next'} onPress={next} style={styles.bottom} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, gap: 12 },
  stepCount: { fontSize: 14, fontWeight: '600', color: colors.primary, textTransform: 'uppercase', marginTop: 8 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  prompt: { fontSize: 17, color: colors.muted, lineHeight: 24 },
  meter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 80, fontWeight: '700', color: colors.text },
  cents: { fontSize: 16, color: colors.muted },
  sofar: { fontSize: 17, color: colors.text, marginTop: 24 },
  error: { color: colors.danger, fontSize: 15 },
  bottom: { marginTop: 'auto' },
});
