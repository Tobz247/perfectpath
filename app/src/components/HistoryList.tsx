import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import type { AnalysisEntry } from '../state/HistoryContext';
import { useTheme } from '../theme';
import { Card, IconBubble, Txt } from './ui';

/** Past analyses, newest first; tapping one opens its result. */
export function HistoryList({ entries }: { entries: AnalysisEntry[] }) {
  const c = useTheme();
  return (
    <View style={styles.list}>
      {entries.map((entry) => (
        <Pressable
          key={entry.id}
          accessibilityRole="button"
          accessibilityLabel={entry.title}
          onPress={() => router.push({ pathname: '/result/[id]', params: { id: entry.id } })}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Card style={styles.row}>
            <IconBubble name={entry.kind === 'score' ? 'document-text' : 'musical-notes'} size={18} color={c.accent} />
            <View style={styles.text}>
              <Txt variant="heading" style={styles.title} numberOfLines={1}>
                {entry.title}
              </Txt>
              <Txt variant="small">
                {entry.kind === 'score' ? 'Choir score' : 'Song'} · {entry.lines.length} part
                {entry.lines.length === 1 ? '' : 's'} · {new Date(entry.analysedAt).toLocaleDateString()}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.muted} />
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  text: { flex: 1 },
  title: { fontSize: 16 },
});
