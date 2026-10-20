import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { HistoryList } from '../../components/HistoryList';
import { Button, IconBubble, Screen, Txt } from '../../components/ui';
import { useHistory } from '../../state/HistoryContext';

export default function History() {
  const { entries } = useHistory();
  if (entries.length === 0) {
    return (
      <Screen fixed style={styles.empty}>
        <View style={styles.emptyBody}>
          <IconBubble name="time" size={32} />
          <Txt variant="heading">No songs yet</Txt>
          <Txt variant="muted" style={styles.center}>
            Songs and scores you analyse appear here, so you can come back to your part and its sol-fa.
          </Txt>
        </View>
        <Button
          title="Upload a song"
          icon="musical-notes"
          onPress={() => router.push({ pathname: '/analyze', params: { kind: 'song' } })}
        />
      </Screen>
    );
  }
  return (
    <Screen>
      <HistoryList entries={entries} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { justifyContent: 'space-between' },
  emptyBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  center: { textAlign: 'center' },
});
