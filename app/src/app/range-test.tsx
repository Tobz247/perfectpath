import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLivePitch } from '../audio/useLivePitch';
import { Button, colors } from '../components/ui';
import { centsOff, freqToMidi, midiToName } from '../pitch/notes';
import type { PitchEstimate } from '../pitch/yin';
import { RangeTracker } from '../range/rangeTracker';
import type { SingerRange } from '../range/types';
import { rankVoiceTypes } from '../range/voiceType';
import { useSingerRange } from '../state/RangeContext';

export default function RangeTest() {
  const tracker = useRef(new RangeTracker());
  const [current, setCurrent] = useState<number | null>(null);
  const [range, setRange] = useState<SingerRange | null>(null);
  const { saveRange } = useSingerRange();

  const handlePitch = useCallback((estimate: PitchEstimate | null) => {
    tracker.current.add(estimate);
    setCurrent(estimate && estimate.confidence >= 0.8 ? freqToMidi(estimate.frequency) : null);
    setRange(tracker.current.result());
  }, []);

  const mic = useLivePitch(handlePitch);
  const listening = mic.status === 'listening';

  const toggle = async () => {
    if (listening) {
      await mic.stop();
      setCurrent(null);
    } else {
      tracker.current.reset();
      setRange(null);
      await mic.start();
    }
  };

  const save = async () => {
    if (!range) return;
    await saveRange(range);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        {listening
          ? 'Slide from your lowest comfortable note to your highest, holding each end for a moment.'
          : 'Tap start, then sing. Only notes you hold steadily count.'}
      </Text>

      <Text style={styles.note}>{current === null ? '–' : midiToName(current)}</Text>
      <Text style={styles.cents}>
        {current === null ? ' ' : `${centsOff(current) > 0 ? '+' : ''}${centsOff(current)} cents`}
      </Text>

      {range && (
        <View style={styles.result}>
          <Text style={styles.resultLine}>
            Range: {midiToName(range.low)} to {midiToName(range.high)}
          </Text>
          <Text style={styles.resultLine}>
            Comfortable: {midiToName(range.comfortable.low)} to {midiToName(range.comfortable.high)}
          </Text>
          {!listening && <Text style={styles.voiceType}>Closest voice type: {rankVoiceTypes(range)[0].type}</Text>}
        </View>
      )}

      {mic.status === 'denied' && <Text style={styles.error}>Microphone access is needed for the range test.</Text>}
      {mic.error && <Text style={styles.error}>{mic.error}</Text>}

      <View style={styles.actions}>
        <Button title={listening ? 'Stop' : range ? 'Test again' : 'Start'} variant={listening ? 'danger' : 'primary'} onPress={toggle} />
        {range && !listening && <Button title="Save my range" variant="secondary" onPress={save} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  hint: { fontSize: 16, color: colors.muted, textAlign: 'center', marginBottom: 32 },
  note: { fontSize: 72, fontWeight: '700', color: colors.text },
  cents: { fontSize: 16, color: colors.muted, marginBottom: 32 },
  result: { alignItems: 'center', marginBottom: 32 },
  resultLine: { fontSize: 18, marginBottom: 4 },
  voiceType: { fontSize: 20, fontWeight: '600', marginTop: 8 },
  error: { color: colors.danger, marginBottom: 16, textAlign: 'center' },
  actions: { gap: 12, alignSelf: 'stretch' },
});
