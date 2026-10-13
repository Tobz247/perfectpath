import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Button, Card, colors } from '../components/ui';
import { midiToName } from '../pitch/notes';
import { rankVoiceTypes } from '../range/voiceType';
import { useSingerRange } from '../state/RangeContext';

export default function Home() {
  const { range, loaded } = useSingerRange();
  if (!loaded) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {range ? (
        <Card>
          <Text style={styles.label}>Your voice</Text>
          <Text style={styles.voiceType}>{rankVoiceTypes(range)[0].type}</Text>
          <Text style={styles.detail}>
            Range {midiToName(range.low)} to {midiToName(range.high)}, comfortable{' '}
            {midiToName(range.comfortable.low)} to {midiToName(range.comfortable.high)}
          </Text>
          <Button title="Retake range test" variant="secondary" onPress={() => router.push('/range-test')} style={styles.retake} />
        </Card>
      ) : (
        <Card>
          <Text style={styles.voiceType}>Find your voice first</Text>
          <Text style={styles.detail}>
            A two-minute range test measures your lowest and highest notes. PerfectPath uses it to pick the right part
            for you in any song.
          </Text>
          <Button title="Take the range test" onPress={() => router.push('/range-test')} style={styles.retake} />
        </Card>
      )}

      <Text style={styles.section}>Find your part</Text>
      <Button
        title="Upload a song"
        disabled={!range}
        onPress={() => router.push({ pathname: '/analyze', params: { kind: 'song' } })}
      />
      <Button
        title="Upload a choir score"
        variant="secondary"
        disabled={!range}
        onPress={() => router.push({ pathname: '/analyze', params: { kind: 'score' } })}
      />
      {!range && <Text style={styles.hint}>Take the range test to unlock song matching.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  label: { color: colors.muted, fontSize: 14, textTransform: 'uppercase', fontWeight: '600' },
  voiceType: { fontSize: 28, fontWeight: '700', color: colors.text, marginVertical: 4 },
  detail: { fontSize: 16, color: colors.muted, lineHeight: 22 },
  retake: { marginTop: 16 },
  section: { fontSize: 20, fontWeight: '700', marginTop: 16, color: colors.text },
  hint: { color: colors.muted, textAlign: 'center' },
});
