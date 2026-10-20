import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { midiToName } from '../pitch/notes';
import type { NoteRange, SingerRange } from '../range/types';
import { fonts, useTheme } from '../theme';

const BLACK = new Set([1, 3, 6, 8, 10]);
const isBlack = (midi: number) => BLACK.has(((midi % 12) + 12) % 12);

/** Widens a span to whole octaves (C to B) so the keyboard always starts on a C. */
function keyboardSpan(ranges: NoteRange[]): NoteRange {
  const low = Math.min(...ranges.map((r) => r.low));
  const high = Math.max(...ranges.map((r) => r.high));
  return { low: Math.floor(low / 12) * 12, high: Math.ceil((high + 1) / 12) * 12 - 1 };
}

/**
 * A small piano keyboard with ranges drawn on it: the singer's comfortable notes
 * in green (full range lighter), a part's range as a blue bar underneath, and an
 * optional live note marker.
 */
export function PianoRange({
  singer,
  part,
  current,
  partLabel = 'This part',
}: {
  singer?: SingerRange | null;
  part?: (NoteRange & { tessitura?: NoteRange }) | null;
  current?: number | null;
  partLabel?: string;
}) {
  const c = useTheme();
  const [width, setWidth] = useState(0);
  const ranges = [singer, part].filter(Boolean) as NoteRange[];
  const span = keyboardSpan(ranges.length ? ranges : [{ low: 48, high: 72 }]);

  const whites: number[] = [];
  for (let m = span.low; m <= span.high; m++) if (!isBlack(m)) whites.push(m);
  const keyWidth = width / whites.length;
  // Left edge of a note's key; black keys sit across the line between two whites.
  const xOf = (midi: number) => {
    const whiteIndex = whites.filter((w) => w < midi).length;
    return isBlack(midi) ? whiteIndex * keyWidth - keyWidth * 0.3 : whiteIndex * keyWidth;
  };
  const widthOf = (midi: number) => (isBlack(midi) ? keyWidth * 0.6 : keyWidth);
  const bar = (r: NoteRange) => ({ left: xOf(r.low), width: xOf(r.high) + widthOf(r.high) - xOf(r.low) });

  const keyColour = (midi: number) => {
    if (singer && midi >= singer.comfortable.low && midi <= singer.comfortable.high) return c.accent;
    if (singer && midi >= singer.low && midi <= singer.high) return c.accent + (isBlack(midi) ? 'aa' : '66');
    // Real key colours in both themes; a dark-mode swap would make the keyboard look inverted.
    return isBlack(midi) ? '#1f2937' : '#f8fafc';
  };

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={styles.wrap}>
      {width > 0 && (
        <>
          <View style={[styles.keys, { borderColor: c.border }]}>
            {whites.map((m) => (
              <View
                key={m}
                style={[styles.white, { width: keyWidth, backgroundColor: keyColour(m), borderColor: c.border }]}
              />
            ))}
            {Array.from({ length: span.high - span.low + 1 }, (_, i) => span.low + i)
              .filter(isBlack)
              .map((m) => (
                <View key={m} style={[styles.black, { left: xOf(m), width: widthOf(m), backgroundColor: keyColour(m) }]} />
              ))}
            {current != null && current >= span.low && current <= span.high && (
              <View style={[styles.marker, { left: xOf(Math.round(current)) + widthOf(Math.round(current)) / 2 - 5, backgroundColor: c.primary }]} />
            )}
          </View>

          {part && (
            <View style={styles.barRow}>
              <View style={[styles.bar, bar(part), { backgroundColor: c.primary + '55' }]} />
              {part.tessitura && <View style={[styles.bar, bar(part.tessitura), { backgroundColor: c.primary }]} />}
            </View>
          )}

          <View style={styles.octaves}>
            {whites
              .filter((m) => m % 12 === 0)
              .map((m) => (
                <Text key={m} style={[styles.octave, { left: xOf(m), color: c.muted }]}>
                  {midiToName(m)}
                </Text>
              ))}
          </View>

          <View style={styles.legend}>
            {singer && <Legend colour={c.accent} text="Your comfortable notes" />}
            {part && <Legend colour={c.primary} text={`${partLabel} (dark: where it mostly sits)`} />}
          </View>
        </>
      )}
    </View>
  );
}

function Legend({ colour, text }: { colour: string; text: string }) {
  const c = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: colour }]} />
      <Text style={[styles.legendText, { color: c.muted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginVertical: 6 },
  keys: { height: 64, flexDirection: 'row', borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
  white: { height: '100%', borderRightWidth: StyleSheet.hairlineWidth },
  black: { position: 'absolute', top: 0, height: 38, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  marker: { position: 'absolute', bottom: 6, width: 10, height: 10, borderRadius: 5 },
  barRow: { height: 10, marginTop: 6 },
  bar: { position: 'absolute', top: 0, height: 10, borderRadius: 5 },
  octaves: { height: 16, marginTop: 2 },
  octave: { position: 'absolute', fontFamily: fonts.regular, fontSize: 10 },
  legend: { marginTop: 4, gap: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: fonts.regular, fontSize: 12 },
});
