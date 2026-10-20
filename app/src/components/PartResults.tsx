import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { playNote } from '../audio/playNote';
import { midiToName } from '../pitch/notes';
import { matchParts } from '../range/match';
import type { SingerRange, Solfa, VocalLine } from '../range/types';
import { rankVoiceTypes } from '../range/voiceType';
import { fonts, useTheme, type Palette } from '../theme';
import { PianoRange } from './PianoRange';
import { Badge, Card, Chip, Txt } from './ui';

function describeShift(semitones: number): string {
  if (semitones === 0) return 'Sing it in the original key';
  const steps = Math.abs(semitones);
  return `Move the key ${steps} semitone${steps === 1 ? '' : 's'} ${semitones < 0 ? 'lower' : 'higher'}`;
}

function fitLabel(score: number, c: Palette): { text: string; color: string } {
  if (score >= 0.75) return { text: 'Great fit', color: c.good };
  if (score >= 0.45) return { text: 'Workable', color: c.warning };
  return { text: 'Hard for your voice', color: c.danger };
}

// Key names as the server writes them (flats for the black-key keys singers usually use).
const KEY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function shiftNote(name: string, semitones: number): string {
  const index = KEY_NAMES.indexOf(name);
  return index === -1 ? name : KEY_NAMES[(((index + semitones) % 12) + 12) % 12];
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

/** The line in tonic sol-fa as tappable chips; notes outside the singer's comfortable range are red. */
function SolfaView({ solfa, singer, transpose }: { solfa: Solfa; singer: SingerRange; transpose: number }) {
  const c = useTheme();
  const outside = (midi: number) => midi + transpose < singer.comfortable.low || midi + transpose > singer.comfortable.high;
  return (
    <View style={styles.solfa}>
      <View style={styles.badges}>
        <Badge icon="key" text={`Doh = ${solfa.doh}`} />
        {transpose !== 0 && <Badge icon="swap-vertical" text={`${shiftNote(solfa.doh, transpose)} after key change`} color={c.accent} />}
        <Badge text={solfa.key} color={c.muted} />
      </View>
      {solfa.phrases.map((phrase, index) => (
        <View key={index} style={[styles.phrase, { borderLeftColor: c.primarySoft }]}>
          {phrase.map((n, i) => {
            const red = outside(n.midi);
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${n.syllable}, ${midiToName(n.midi + transpose)}`}
                onPress={() => playNote(n.midi + transpose)}
                style={({ pressed }) => [
                  styles.note,
                  { backgroundColor: red ? c.danger + '1f' : c.primarySoft },
                  pressed && { backgroundColor: c.accent + '55' },
                ]}
              >
                <Txt style={[styles.syllable, { color: red ? c.danger : c.text }]}>{n.syllable}</Txt>
              </Pressable>
            );
          })}
        </View>
      ))}
      <Txt variant="small">Tap a note to hear it. Worked out from the music, so check it by ear. Red notes sit outside your comfortable range.</Txt>
    </View>
  );
}

/** Lists the song's vocal lines from best to worst fit, then the sol-fa for the part the singer picks. */
export function PartResults({ singer, lines }: { singer: SingerRange; lines: VocalLine[] }) {
  const c = useTheme();
  const matches = matchParts(singer, lines);
  const withSolfa = matches.filter((m) => m.line.solfa);
  const [chosen, setChosen] = useState(withSolfa[0]?.line.name);
  const shown = withSolfa.find((m) => m.line.name === chosen) ?? withSolfa[0];

  return (
    <View style={styles.list}>
      {matches.map(({ line, transpose, score }, index) => {
        const fit = fitLabel(score, c);
        return (
          <Card key={line.name} highlight={index === 0}>
            {index === 0 && <Txt variant="label">Your best part</Txt>}
            <View style={styles.titleRow}>
              <Txt variant="heading" style={styles.partName}>
                {line.name}
              </Txt>
              <Badge text={`${fit.text} · ${Math.round(score * 100)}%`} color={fit.color} />
            </View>
            <Txt variant="muted">Voice part: {partVoiceType(line)}</Txt>
            <Txt variant="muted">{describeShift(transpose)}</Txt>
            <PianoRange singer={singer} part={line} partLabel={line.name} />
            <Txt variant="small">
              Range {midiToName(line.low)} to {midiToName(line.high)}, mostly {midiToName(line.tessitura.low)} to{' '}
              {midiToName(line.tessitura.high)}
            </Txt>
          </Card>
        );
      })}

      {shown?.line.solfa && (
        <Card style={styles.solfaCard}>
          <Txt variant="label">Sol-fa</Txt>
          {withSolfa.length > 1 && (
            <View style={styles.chips}>
              {withSolfa.map(({ line }) => (
                <Chip key={line.name} label={line.name} selected={line.name === shown.line.name} onPress={() => setChosen(line.name)} />
              ))}
            </View>
          )}
          <Txt variant="heading">{shown.line.name}</Txt>
          <Txt variant="muted">Voice part: {partVoiceType(shown.line)}</Txt>
          <SolfaView solfa={shown.line.solfa} singer={singer} transpose={shown.transpose} />
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  partName: { flexShrink: 1 },
  solfaCard: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  solfa: { gap: 10, marginTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  phrase: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, borderLeftWidth: 3, paddingLeft: 8 },
  note: { minWidth: 40, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center' },
  syllable: { fontFamily: fonts.semibold, fontSize: 17 },
});
