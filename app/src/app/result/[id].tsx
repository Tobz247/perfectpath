import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { PartResults } from '../../components/PartResults';
import { Badge, Button, Screen, Txt } from '../../components/ui';
import { useHistory } from '../../state/HistoryContext';
import { useSingerRange } from '../../state/RangeContext';

export default function Result() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, removeEntry } = useHistory();
  const { range } = useSingerRange();
  const entry = entries.find((e) => e.id === id);

  if (!entry || !range) {
    return (
      <Screen>
        <Txt variant="muted">This result is no longer saved.</Txt>
      </Screen>
    );
  }

  const remove = async () => {
    await removeEntry(entry.id);
    router.back();
  };

  return (
    <Screen>
      <Txt variant="title">{entry.title}</Txt>
      <View style={styles.meta}>
        <Badge icon={entry.kind === 'score' ? 'document-text' : 'musical-notes'} text={entry.kind === 'score' ? 'Choir score' : 'Song'} />
        <Txt variant="small">Analysed {new Date(entry.analysedAt).toLocaleDateString()}</Txt>
      </View>
      <PartResults singer={range} lines={entry.lines} />
      <Button
        title="Try another song"
        icon="musical-notes"
        onPress={() => router.replace({ pathname: '/analyze', params: { kind: entry.kind } })}
      />
      <Button title="Remove from history" variant="ghost" icon="trash" onPress={remove} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
});
