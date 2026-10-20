import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { playLine, playNote, type Playback } from '../audio/playNote';
import { midiToName } from '../pitch/notes';
import { matchParts } from '../range/match';
import type { SingerRange, Solfa, VocalLine } from '../range/types';
import { rankVoiceTypes } from '../range/voiceType';
import { fonts, useTheme, type Palette } from '../theme';
import { PianoRange } from './PianoRange';
import { Badge, Button, Card, Chip, Txt } from './ui';

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

/**
 * The line in tonic sol-fa as tappable chips, with playback of the whole part
 * or one phrase so the singer hears how it goes. Notes outside the singer's
 * comfortable range are red; the note being played is highlighted.
 */
function SolfaView({ solfa, singer, transpose }: { solfa: Solfa; singer: SingerRange; transpose: number }) {
  const c = useTheme();
  const [playing, setPlaying] = useState<{ phrase: number; note: number } | null>(null);
  const [slow, setSlow] = useState(false);
  const playback = useRef<Playback | null>(null);
  const outside = (midi: number) => midi + transpose < singer.comfortable.low || midi + transpose > singer.comfortable.high;

  const stop = () => {
    playback.current?.stop();
    playback.current = null;
    setPlaying(null);
  };
  useEffect(() => stop, []);

  /** Plays phrases [from, to) in order, keeping track of which note is sounding. */
  const play = (from: number, to: number) => {
    stop();
    const positions = solfa.phrases.slice(from, to).flatMap((phrase, p) => phrase.map((_, n) => ({ phrase: from + p, note: n })));
    const notes = solfa.phrases.slice(from, to).flat().map((n) => ({ ...n, midi: n.midi + transpose }));
    playback.current = playLine(
      notes,
      (index) => {
        if (index === -1) {
          playback.current = null;
          setPlaying(null);
        } else setPlaying(positions[index]);
      },
      // Scores are timed in beats; play them at 100 beats a minute.
      { secondsPerUnit: solfa.timeUnit === 'beats' ? 0.6 : 1, slower: slow ? 1.6 : 1 },
    );
  };

  return (
    <View style={styles.solfa}>
      <View style={styles.badges}>
        <Badge icon="key" text={`Doh = ${solfa.doh}`} />
        {transpose !== 0 && <Badge icon="swap-vertical" text={`${shiftNote(solfa.doh, transpose)} after key change`} color={c.accent} />}
        <Badge text={solfa.key} color={c.muted} />
      </View>
      <View style={styles.controls}>
        <Button
          title={playing ? 'Stop' : 'Play this part'}
          icon={playing ? 'stop' : 'play'}
          onPress={playing ? stop : () => play(0, solfa.phrases.length)}
          style={styles.playButton}
        />
        <Chip label="Slow" selected={slow} onPress={() => setSlow(!slow)} />
      </View>
      {solfa.phrases.map((phrase, index) => (
        <View key={index} style={[styles.phraseRow, { borderLeftColor: playing?.phrase === index ? c.accent : c.primarySoft }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Play phrase ${index + 1}`}
            onPress={() => play(index, index + 1)}
            hitSlop={8}
          >
            <Ionicons name="play-circle" size={26} color={c.primary} />
          </Pressable>
          <View style={styles.phrase}>
            {phrase.map((n, i) => {
              const red = outside(n.midi);
              const active = playing?.phrase === index && playing.note === i;
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`${n.syllable}, ${midiToName(n.midi + transpose)}`}
                  onPress={() => playNote(n.midi + transpose)}
                  style={({ pressed }) => [
                    styles.note,
                    { backgroundColor: red ? c.danger + '1f' : c.primarySoft },
                    (pressed || active) && { backgroundColor: c.accent },
                  ]}
                >
                  <Txt style={[styles.syllable, { color: active ? c.onPrimary : red ? c.danger : c.text }]}>{n.syllable}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Txt variant="small">
        Play the part or a single phrase to hear how it goes, or tap a note. Worked out from the music, so check it by ear.
        Red notes sit outside your comfortable range.
      </Txt>
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
          <SolfaView key={shown.line.name} solfa={shown.line.solfa} singer={singer} transpose={shown.transpose} />
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
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playButton: { flex: 1 },
  phraseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderLeftWidth: 3, paddingLeft: 8 },
  phrase: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  note: { minWidth: 40, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center' },
  syllable: { fontFamily: fonts.semibold, fontSize: 17 },
});
