import { StyleSheet, View } from 'react-native';
import { midiToName } from '../pitch/notes';
import type { SingerRange } from '../range/types';
import { rankVoiceTypes } from '../range/voiceType';
import { useTheme } from '../theme';
import { PianoRange } from './PianoRange';
import { Card, IconBubble, Txt } from './ui';

/** The singer's voice type, range keyboard and note numbers. */
export function VoiceSummary({ range }: { range: SingerRange }) {
  const c = useTheme();
  const [best, runnerUp] = rankVoiceTypes(range);
  return (
    <>
      <Card>
        <Txt variant="label">You sing closest to</Txt>
        <Txt variant="title" color={c.primary} style={styles.type}>
          {best.type}
        </Txt>
        <Txt variant="muted">
          {runnerUp.score > best.score - 0.1 ? `You're also close to ${runnerUp.type.toLowerCase()}. ` : ''}
          Voice types are a guide; your range can grow with practice and warm-up.
        </Txt>
        <PianoRange singer={range} />
      </Card>
      <View style={styles.stats}>
        <Stat icon="swap-vertical" label="Full range" value={`${midiToName(range.low)} – ${midiToName(range.high)}`} />
        <Stat
          icon="heart"
          label="Comfortable"
          value={`${midiToName(range.comfortable.low)} – ${midiToName(range.comfortable.high)}`}
          color={c.accent}
        />
      </View>
    </>
  );
}

function Stat({ icon, label, value, color }: { icon: 'swap-vertical' | 'heart'; label: string; value: string; color?: string }) {
  return (
    <Card style={styles.stat}>
      <IconBubble name={icon} size={16} color={color} />
      <Txt variant="small">{label}</Txt>
      <Txt variant="heading">{value}</Txt>
    </Card>
  );
}

const styles = StyleSheet.create({
  type: { fontSize: 34, lineHeight: 42 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, gap: 4 },
});
