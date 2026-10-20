import { Redirect, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, colors } from '../components/ui';
import { midiToName } from '../pitch/notes';
import { rankVoiceTypes } from '../range/voiceType';
import { useHistory } from '../state/HistoryContext';
import { useSingerRange } from '../state/RangeContext';

export default function Home() {
  const { range, loaded } = useSingerRange();
  const { entries } = useHistory();
  if (!loaded) return null;
  if (!range) return <Redirect href="/welcome" />;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Card>
          <Text style={styles.label}>Your voice</Text>
          <Text style={styles.voiceType}>{rankVoiceTypes(range)[0].type}</Text>
          <Text style={styles.detail}>
            Range {midiToName(range.low)} to {midiToName(range.high)}, comfortable{' '}
            {midiToName(range.comfortable.low)} to {midiToName(range.comfortable.high)}
          </Text>
          <Button title="Retake range test" variant="secondary" onPress={() => router.push('/range-test')} style={styles.retake} />
        </Card>

        <Text style={styles.section}>Find your part</Text>
        <Button
          title="Upload a song"
          onPress={() => router.push({ pathname: '/analyze', params: { kind: 'song' } })}
        />
        <Button
          title="Upload a choir score"
          variant="secondary"
          onPress={() => router.push({ pathname: '/analyze', params: { kind: 'score' } })}
        />

        {entries.length > 0 && <Text style={styles.section}>Recent</Text>}
        {entries.slice(0, 10).map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/result/[id]', params: { id: entry.id } })}
          >
            <Card>
              <Text style={styles.entryTitle}>{entry.title}</Text>
              <Text style={styles.entryMeta}>
                {entry.kind === 'score' ? 'Choir score' : 'Song'} · {new Date(entry.analysedAt).toLocaleDateString()}
              </Text>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { padding: 20, gap: 12 },
  label: { color: colors.muted, fontSize: 14, textTransform: 'uppercase', fontWeight: '600' },
  voiceType: { fontSize: 28, fontWeight: '700', color: colors.text, marginVertical: 4 },
  detail: { fontSize: 16, color: colors.muted, lineHeight: 22 },
  retake: { marginTop: 16 },
  section: { fontSize: 20, fontWeight: '700', marginTop: 16, color: colors.text },
  entryTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  entryMeta: { fontSize: 14, color: colors.muted, marginTop: 2 },
});
