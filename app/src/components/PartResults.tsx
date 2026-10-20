import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { midiToName } from '../pitch/notes';
import { matchParts } from '../range/match';
import { rankVoiceTypes } from '../range/voiceType';
import type { SingerRange, Solfa, VocalLine } from '../range/types';
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

// Key names as the server writes them (flats for the black-key keys singers usually use).
const KEY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function shiftNote(name: string, semitones: number): string {
  const index = KEY_NAMES.indexOf(name);
  return index === -1 ? name : KEY_NAMES[(((index + semitones) % 12) + 12) % 12];
}

/** The line in tonic sol-fa; notes outside the singer's comfortable range are highlighted. */
function SolfaView({ solfa, singer, transpose }: { solfa: Solfa; singer: SingerRange; transpose: number }) {
  const outside = (midi: number) => midi + transpose < singer.comfortable.low || midi + transpose > singer.comfortable.high;
  return (
    <View style={styles.solfa}>
      <Text style={styles.detail}>
        Doh is {solfa.doh}
        {transpose !== 0 ? ` (${shiftNote(solfa.doh, transpose)} after the key change)` : ''} · {solfa.key}
      </Text>
      {solfa.phrases.map((phrase, index) => (
        <Text key={index} style={styles.phrase}>
          {phrase.map((n, i) => (
            <Text key={i} style={outside(n.midi) ? styles.outside : undefined}>
              {i > 0 ? '  ' : ''}
              {n.syllable}
            </Text>
          ))}
        </Text>
      ))}
      <Text style={styles.note}>Worked out from the music, so check it by ear. Red notes sit outside your comfortable range.</Text>
    </View>
  );
}

/**
 * The voice type whose usual range this line sits in, e.g. "Tenor". Ranges of
 * neighbouring types overlap a lot (a high tenor line sits where altos sing),
 * so a close second is named too.
 */
function partVoiceType(line: VocalLine): string {
  const [best, next] = rankVoiceTypes(line.tessitura);
  return next && best.score - next.score <= 0.2 ? `${best.type} or ${next.type}` : best.type;
}

/** Lists the song's vocal lines from best to worst fit, then the sol-fa for the part the singer picks. */
export function PartResults({ singer, lines }: { singer: SingerRange; lines: VocalLine[] }) {
  const matches = matchParts(singer, lines);
  const withSolfa = matches.filter((m) => m.line.solfa);
  const [chosen, setChosen] = useState(withSolfa[0]?.line.name);
  const shown = withSolfa.find((m) => m.line.name === chosen) ?? withSolfa[0];

  return (
    <View style={styles.list}>
      {matches.map(({ line, transpose, score }, index) => {
        const fit = fitLabel(score);
        return (
          <Card key={line.name} style={index === 0 ? styles.best : undefined}>
            {index === 0 && <Text style={styles.badge}>Your best part</Text>}
            <Text style={styles.name}>{line.name}</Text>
            <Text style={styles.voicePart}>Voice part: {partVoiceType(line)}</Text>
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

      {shown?.line.solfa && (
        <Card style={styles.solfaCard}>
          <Text style={styles.badge}>Sol-fa</Text>
          {withSolfa.length > 1 && (
            <View style={styles.chips}>
              {withSolfa.map(({ line }) => {
                const selected = line.name === shown.line.name;
                return (
                  <Pressable
                    key={line.name}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setChosen(line.name)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{line.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Text style={styles.name}>{shown.line.name}</Text>
          <Text style={styles.voicePart}>Voice part: {partVoiceType(shown.line)}</Text>
          <SolfaView solfa={shown.line.solfa} singer={singer} transpose={shown.transpose} />
        </Card>
      )}
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
  solfa: { marginTop: 10, gap: 6 },
  voicePart: { fontSize: 15, fontWeight: '600', color: colors.primary, marginTop: 2 },
  solfaCard: { gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipSelected: { backgroundColor: colors.primary },
  chipLabel: { color: colors.primary, fontWeight: '600' },
  chipLabelSelected: { color: '#fff' },
  phrase: { fontSize: 18, color: colors.text, lineHeight: 26 },
  outside: { color: colors.danger, fontWeight: '700' },
  note: { fontSize: 13, color: colors.muted },
});
