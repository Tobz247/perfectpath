import { StyleSheet, Text, View } from 'react-native';
import { midiToName } from '../pitch/notes';
import { matchParts } from '../range/match';
import type { SingerRange, VocalLine } from '../range/types';
import { Card, colors } from './ui';

function describeShift(semitones: number): string {
  if (semitones === 0) return 'Sing it in the original key';
  const steps = Math.abs(semitones);
  return `Move the key ${steps} semitone${steps === 1 ? '' : 's'} ${semitones < 0 ? 'lower' : 'higher'}`;
}

function fitLabel(score: number): { text: string; color: string } {
  if (score >= 0.75) return { text: 'Great fit', color: colors.good };
  if (score >= 0.45) return { text: 'Workable', color: '#e67700' };
  return { text: 'Hard for your voice', color: colors.danger };
}

/** Lists the song's vocal lines from best to worst fit for this singer. */
export function PartResults({ singer, lines }: { singer: SingerRange; lines: VocalLine[] }) {
  const matches = matchParts(singer, lines);
  return (
    <View style={styles.list}>
      {matches.map(({ line, transpose, score }, index) => {
        const fit = fitLabel(score);
        return (
          <Card key={line.name} style={index === 0 ? styles.best : undefined}>
            {index === 0 && <Text style={styles.badge}>Your best part</Text>}
            <Text style={styles.name}>{line.name}</Text>
            <Text style={[styles.fit, { color: fit.color }]}>
              {fit.text} · {Math.round(score * 100)}%
            </Text>
            <Text style={styles.detail}>{describeShift(transpose)}</Text>
            <Text style={styles.detail}>
              Range {midiToName(line.low)} to {midiToName(line.high)}, mostly {midiToName(line.tessitura.low)} to{' '}
              {midiToName(line.tessitura.high)}
            </Text>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  best: { borderWidth: 2, borderColor: colors.primary },
  badge: { color: colors.primary, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', fontSize: 12 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  fit: { fontSize: 16, fontWeight: '600', marginVertical: 4 },
  detail: { fontSize: 15, color: colors.muted, marginTop: 2 },
});
