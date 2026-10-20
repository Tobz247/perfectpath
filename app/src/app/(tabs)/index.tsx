import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AnalysisKind } from '../../api/analysis';
import { HistoryList } from '../../components/HistoryList';
import { PianoRange } from '../../components/PianoRange';
import { Card, IconBubble, Screen, Txt, type IconName } from '../../components/ui';
import { rankVoiceTypes } from '../../range/voiceType';
import { useHistory } from '../../state/HistoryContext';
import { useSingerRange } from '../../state/RangeContext';
import { useTheme } from '../../theme';

function ActionTile({ icon, title, detail, onPress }: { icon: IconName; title: string; detail: string; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <Card style={styles.tileCard}>
        <IconBubble name={icon} />
        <Txt variant="heading" style={styles.tileTitle}>
          {title}
        </Txt>
        <View style={styles.tileFooter}>
          <Txt variant="small">{detail}</Txt>
          <Ionicons name="arrow-forward" size={18} color={c.primary} />
        </View>
      </Card>
    </Pressable>
  );
}

export default function Home() {
  const c = useTheme();
  const { range, loaded } = useSingerRange();
  const { entries } = useHistory();
  if (!loaded) return null;
  if (!range) return <Redirect href="/welcome" />;

  const open = (kind: AnalysisKind) => router.push({ pathname: '/analyze', params: { kind } });

  return (
    <Screen>
      <Card>
        <Txt variant="label">Your voice</Txt>
        <Txt variant="title" color={c.primary}>
          {rankVoiceTypes(range)[0].type}
        </Txt>
        <PianoRange singer={range} />
      </Card>

      <Txt variant="heading" style={styles.section}>
        Find your part
      </Txt>
      <View style={styles.actions}>
        <ActionTile icon="musical-notes" title="Upload a song" detail="MP3, M4A, WAV" onPress={() => open('song')} />
        <ActionTile icon="document-text" title="Choir score" detail="MusicXML" onPress={() => open('score')} />
      </View>

      {entries.length > 0 && (
        <>
          <Txt variant="heading" style={styles.section}>
            Recent
          </Txt>
          <HistoryList entries={entries.slice(0, 5)} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1 },
  pressed: { opacity: 0.7 },
  tileCard: { gap: 10 },
  tileTitle: { fontSize: 16 },
  tileFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
