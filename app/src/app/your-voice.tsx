import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { VoiceSummary } from '../components/VoiceSummary';
import { Button, Screen } from '../components/ui';
import { useSingerRange } from '../state/RangeContext';

export default function YourVoice() {
  const { range } = useSingerRange();
  if (!range) return null;

  const goHome = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  return (
    <Screen>
      <VoiceSummary range={range} />
      <View style={styles.actions}>
        <Button title="Find my part in a song" icon="musical-notes" onPress={goHome} />
        <Button title="Redo the test" variant="secondary" icon="refresh" onPress={() => router.replace('/range-test')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12, marginTop: 8 },
});
