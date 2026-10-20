import { router } from 'expo-router';
import { VoiceSummary } from '../../components/VoiceSummary';
import { Button, Screen } from '../../components/ui';
import { useSingerRange } from '../../state/RangeContext';

export default function MyVoice() {
  const { range } = useSingerRange();
  return (
    <Screen>
      {range && <VoiceSummary range={range} />}
      <Button title={range ? 'Retake the range test' : 'Take the range test'} icon="mic" onPress={() => router.push('/range-test')} />
    </Screen>
  );
}
