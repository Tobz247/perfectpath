import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLivePitch } from './src/audio/useLivePitch';
import { centsOff, freqToMidi, midiToName } from './src/pitch/notes';
import type { PitchEstimate } from './src/pitch/yin';
import { RangeTracker } from './src/range/rangeTracker';
import type { SingerRange } from './src/range/types';
import { rankVoiceTypes } from './src/range/voiceType';

export default function App() {
  const tracker = useRef(new RangeTracker());
  const [current, setCurrent] = useState<number | null>(null);
  const [range, setRange] = useState<SingerRange | null>(null);

  const handlePitch = useCallback((estimate: PitchEstimate | null) => {
    tracker.current.add(estimate);
    setCurrent(estimate && estimate.confidence >= 0.8 ? freqToMidi(estimate.frequency) : null);
    setRange(tracker.current.result());
  }, []);

  const mic = useLivePitch(handlePitch);
  const listening = mic.status === 'listening';
  const voiceType = range ? rankVoiceTypes(range)[0].type : null;

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Range test</Text>
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
          {!listening && <Text style={styles.voiceType}>Closest voice type: {voiceType}</Text>}
        </View>
      )}

      {mic.status === 'denied' && <Text style={styles.error}>Microphone access is needed for the range test.</Text>}
      {mic.error && <Text style={styles.error}>{mic.error}</Text>}

      <Pressable style={[styles.button, listening && styles.buttonStop]} onPress={toggle}>
        <Text style={styles.buttonText}>{listening ? 'Stop' : 'Start'}</Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 32 },
  note: { fontSize: 72, fontWeight: '700' },
  cents: { fontSize: 16, color: '#777', marginBottom: 32 },
  result: { alignItems: 'center', marginBottom: 32 },
  resultLine: { fontSize: 18, marginBottom: 4 },
  voiceType: { fontSize: 20, fontWeight: '600', marginTop: 8 },
  error: { color: '#b00020', marginBottom: 16, textAlign: 'center' },
  button: { backgroundColor: '#3b5bdb', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 28 },
  buttonStop: { backgroundColor: '#c92a2a' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
