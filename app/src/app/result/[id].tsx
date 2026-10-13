import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { PartResults } from '../../components/PartResults';
import { Button, colors } from '../../components/ui';
import { useHistory } from '../../state/HistoryContext';
import { useSingerRange } from '../../state/RangeContext';

export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, removeEntry } = useHistory();
  const { range } = useSingerRange();
  const entry = entries.find((e) => e.id === id);

  if (!entry || !range) {
    return <Text style={styles.missing}>This result is no longer saved.</Text>;
  }

  const remove = async () => {
    await removeEntry(entry.id);
    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{entry.title}</Text>
      <Text style={styles.meta}>
        {entry.kind === 'score' ? 'Choir score' : 'Song'} · analysed {new Date(entry.analysedAt).toLocaleDateString()}
      </Text>
      <PartResults singer={range} lines={entry.lines} />
      <Button title="Try another song" onPress={() => router.replace({ pathname: '/analyze', params: { kind: entry.kind } })} />
      <Button title="Remove from history" variant="secondary" onPress={remove} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  meta: { fontSize: 15, color: colors.muted, marginBottom: 4 },
  missing: { padding: 24, fontSize: 16, color: colors.muted },
});
