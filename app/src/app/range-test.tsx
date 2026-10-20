import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLivePitch } from '../audio/useLivePitch';
import { PianoRange } from '../components/PianoRange';
import { Button, IconBubble, ProgressBar, Screen, Txt } from '../components/ui';
import { tick } from '../haptics';
import { centsOff, freqToMidi, midiToName } from '../pitch/notes';
import type { PitchEstimate } from '../pitch/yin';
import { RangeTracker } from '../range/rangeTracker';
import type { SingerRange } from '../range/types';
import { useSingerRange } from '../state/RangeContext';
import { fonts, useTheme } from '../theme';

const STEPS = [
  { title: 'Warm up', prompt: 'Hum a comfortable note in the middle of your voice for a few seconds.' },
  { title: 'Lowest note', prompt: 'Slide down slowly to the lowest note you can sing clearly, and hold it.' },
  { title: 'Highest note', prompt: 'Now slide up to the highest note you can sing without straining, and hold it.' },
];

// About half a second of audio frames: long enough that a held note clearly counts.
const LOCK_FRAMES = 10;

export default function RangeTest() {
  const c = useTheme();
  const tracker = useRef(new RangeTracker());
  const held = useRef({ note: null as number | null, frames: 0 });
  const [step, setStep] = useState(-1);
  const [current, setCurrent] = useState<number | null>(null);
  const [hold, setHold] = useState(0);
  const [range, setRange] = useState<SingerRange | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const { saveRange } = useSingerRange();

  const handlePitch = useCallback((estimate: PitchEstimate | null) => {
    tracker.current.add(estimate);
    const midi = estimate && estimate.confidence >= 0.8 ? freqToMidi(estimate.frequency) : null;
    setCurrent(midi);

    // How long the same note has been held; a short buzz when it locks in.
    const note = midi === null ? null : Math.round(midi);
    const h = held.current;
    h.frames = note === null ? 0 : note === h.note ? h.frames + 1 : 1;
    h.note = note;
    if (h.frames === LOCK_FRAMES) tick();
    setHold(Math.min(1, h.frames / LOCK_FRAMES));

    // Only re-render the range when it actually changes, not on every frame.
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
      <Screen fixed>
        <View style={styles.intro}>
          <IconBubble name="mic" size={36} />
          <Txt variant="title" style={styles.center}>
            Let's measure your voice
          </Txt>
          <Txt variant="muted" style={styles.center}>
            Find a quiet spot and hold your phone about an arm's length away. There are three short steps, and only notes
            you hold steadily count. Your phone buzzes when a note locks in.
          </Txt>
          {problem && <Txt color={c.danger}>{problem}</Txt>}
          {mic.status === 'denied' && <Txt color={c.danger}>Microphone access is needed for the range test.</Txt>}
          {mic.error && <Txt color={c.danger}>{mic.error}</Txt>}
        </View>
        <Button title="Start" icon="play" onPress={start} />
      </Screen>
    );
  }

  const { title, prompt } = STEPS[step];
  const cents = current === null ? 0 : centsOff(current);
  const locked = hold >= 1;
  const last = step === STEPS.length - 1;
  return (
    <Screen fixed>
      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={[styles.stepBar, { backgroundColor: i <= step ? c.primary : c.border }]} />
        ))}
      </View>
      <Txt variant="label">
        Step {step + 1} of {STEPS.length}
      </Txt>
      <Txt variant="title">{title}</Txt>
      <Txt variant="muted">{prompt}</Txt>

      <View style={styles.meter}>
        <View
          style={[
            styles.ring,
            { borderColor: locked ? c.accent : current === null ? c.border : c.primary, backgroundColor: c.card },
          ]}
        >
          <Txt style={[styles.note, { color: locked ? c.accent : c.text }]}>{current === null ? '–' : midiToName(current)}</Txt>
          <Txt variant="small">{current === null ? 'Listening…' : locked ? 'Got it' : 'Hold it…'}</Txt>
        </View>

        {/* Tuning needle: the centre line means right on the note. */}
        <View style={[styles.tuner, { backgroundColor: c.border }]}>
          <View style={[styles.tunerCentre, { backgroundColor: c.muted }]} />
          {current !== null && <View style={[styles.needle, { left: `${50 + cents}%`, backgroundColor: c.primary }]} />}
        </View>
        <Txt variant="small">{current === null ? ' ' : `${cents > 0 ? '+' : ''}${cents} cents`}</Txt>

        <View style={styles.hold}>
          <ProgressBar value={hold} color={locked ? c.accent : c.primary} />
        </View>
      </View>

      <PianoRange singer={range} current={current} />
      <Button title={last ? 'Finish' : 'Next'} icon={last ? 'checkmark' : 'arrow-forward'} onPress={next} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  center: { textAlign: 'center' },
  steps: { flexDirection: 'row', gap: 6 },
  stepBar: { flex: 1, height: 4, borderRadius: 2 },
  meter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  ring: { width: 180, height: 180, borderRadius: 90, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  note: { fontFamily: fonts.bold, fontSize: 52, lineHeight: 66 },
  tuner: { width: '80%', height: 6, borderRadius: 3, marginTop: 8 },
  tunerCentre: { position: 'absolute', left: '50%', top: -4, width: 2, height: 14, marginLeft: -1 },
  needle: { position: 'absolute', top: -5, width: 16, height: 16, borderRadius: 8, marginLeft: -8 },
  hold: { width: '60%' },
});
