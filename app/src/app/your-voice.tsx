import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, colors } from '../components/ui';
import { midiToName } from '../pitch/notes';
import { rankVoiceTypes } from '../range/voiceType';
import { useSingerRange } from '../state/RangeContext';

export default function YourVoice() {
  const { range } = useSingerRange();
  if (!range) return null;
  const [best, runnerUp] = rankVoiceTypes(range);

  const goHome = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>You sing closest to</Text>
      <Text style={styles.voiceType}>{best.type}</Text>
      <Text style={styles.detail}>
        {runnerUp.score > best.score - 0.1 ? `You're also close to ${runnerUp.type.toLowerCase()}. ` : ''}
        Voice types are a guide; your range can grow with practice and warm-up.
      </Text>

      <Card style={styles.card}>
        <Text style={styles.row}>
          Full range: {midiToName(range.low)} to {midiToName(range.high)}
        </Text>
        <Text style={styles.row}>
          Comfortable: {midiToName(range.comfortable.low)} to {midiToName(range.comfortable.high)}
        </Text>
      </Card>

      <View style={styles.actions}>
        <Button title="Find my part in a song" onPress={goHome} />
        <Button title="Redo the test" variant="secondary" onPress={() => router.replace('/range-test')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, gap: 12 },
  label: { fontSize: 16, color: colors.muted, marginTop: 24 },
  voiceType: { fontSize: 40, fontWeight: '800', color: colors.primary },
  detail: { fontSize: 16, color: colors.muted, lineHeight: 22 },
  card: { marginTop: 12, gap: 6 },
  row: { fontSize: 17, color: colors.text },
  actions: { marginTop: 'auto', gap: 12 },
});
