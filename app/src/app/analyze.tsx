import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { analyzeFile, type AnalysisKind, type PickedFile, type Progress } from '../api/analysis';
import { Button, Card, IconBubble, ProgressBar, Screen, Txt } from '../components/ui';
import { useHistory } from '../state/HistoryContext';
import { useSingerRange } from '../state/RangeContext';
import { fonts, useTheme } from '../theme';

const COPY: Record<AnalysisKind, { title: string; intro: string; pickTypes: string[]; extensions: string[] }> = {
  song: {
    title: 'Find your part in a song',
    intro: 'Pick a song file you own. PerfectPath separates the voices, measures each part and deletes the audio afterwards.',
    pickTypes: ['audio/*'],
    extensions: ['.mp3', '.m4a', '.wav', '.flac', '.ogg', '.aac'],
  },
  score: {
    title: 'Find your part in a choir piece',
    intro: 'Pick the score as a MusicXML file (.musicxml, .xml or .mxl). Most notation apps and choir libraries can export it.',
    pickTypes: ['*/*'],
    extensions: ['.musicxml', '.xml', '.mxl'],
  },
};

const UPLOADING = 'Uploading';

/** Counts up while a long step runs, so the screen visibly keeps moving. */
function useElapsed(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return setSeconds(0);
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return seconds;
}

export default function Analyze() {
  const c = useTheme();
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const kind: AnalysisKind = kindParam === 'score' ? 'score' : 'song';
  const copy = COPY[kind];
  const { range } = useSingerRange();
  const { addEntry } = useHistory();

  const [file, setFile] = useState<PickedFile | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const elapsed = useElapsed(busy);

  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: copy.pickTypes, copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    const extension = asset.name.slice(asset.name.lastIndexOf('.')).toLowerCase();
    if (!copy.extensions.includes(extension)) {
      setError(`That file type isn't supported here. Use ${copy.extensions.join(', ')}.`);
      return;
    }
    setError(null);
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
  };

  const analyze = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(null);
    setError(null);
    try {
      const lines = await analyzeFile(kind, file, setProgress);
      const title = file.name.replace(/\.[^.]+$/, '');
      const entry = await addEntry({ title, kind, lines });
      router.replace({ pathname: '/result/[id]', params: { id: entry.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  // Uploading counts as the first step, then the server's own steps follow.
  const steps = [UPLOADING, ...(progress?.steps ?? (kind === 'song' ? [] : ['Reading the score']))];
  const active = progress ? progress.step + 1 : 0;
  const fraction = steps.length > 1 ? Math.max(active, 0.3) / steps.length : 0.3;

  return (
    <Screen>
      <Txt variant="title">{copy.title}</Txt>
      <Txt variant="muted">{copy.intro}</Txt>

      <Pressable accessibilityRole="button" onPress={pick} disabled={busy}>
        <Card style={[styles.picker, { borderStyle: 'dashed', borderColor: c.primary }]}>
          <IconBubble name={file ? 'musical-note' : 'cloud-upload'} />
          <View style={styles.pickerText}>
            <Txt variant="heading" style={styles.fileName} numberOfLines={2}>
              {file ? file.name : 'Choose a file'}
            </Txt>
            <Txt variant="small">{file ? 'Tap to change' : copy.extensions.join('  ')}</Txt>
          </View>
        </Card>
      </Pressable>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: rightsConfirmed }}
        style={styles.checkRow}
        onPress={() => setRightsConfirmed((value) => !value)}
        disabled={busy}
      >
        <View style={[styles.checkbox, { borderColor: c.primary }, rightsConfirmed && { backgroundColor: c.primary }]}>
          {rightsConfirmed && <Ionicons name="checkmark" size={18} color={c.onPrimary} />}
        </View>
        <Txt style={styles.checkLabel}>I own this file or have the right to use it.</Txt>
      </Pressable>

      <Button
        title={busy ? 'Working…' : 'Find my part'}
        icon="sparkles"
        onPress={analyze}
        disabled={!file || !rightsConfirmed || busy || !range}
      />

      {busy && (
        <Card style={styles.progress}>
          <View style={styles.progressHead}>
            <Txt variant="heading">Analysing</Txt>
            <Txt variant="small">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </Txt>
          </View>
          <ProgressBar value={fraction} />
          {steps.map((label, index) => {
            const state = index < active ? 'done' : index === active ? 'active' : 'waiting';
            return (
              <View key={label} style={styles.stepRow}>
                {state === 'done' ? (
                  <Ionicons name="checkmark-circle" size={22} color={c.accent} />
                ) : state === 'active' ? (
                  <ActivityIndicator color={c.primary} />
                ) : (
                  <Ionicons name="ellipse-outline" size={22} color={c.border} />
                )}
                <Txt style={[styles.stepLabel, { color: state === 'waiting' ? c.muted : c.text }]}>{label}</Txt>
              </View>
            );
          })}
          {kind === 'song' && (
            <Txt variant="small">Separating voices takes a few minutes on a computer without a graphics card. Keep the app open.</Txt>
          )}
        </Card>
      )}
      {error && <Txt color={c.danger}>{error}</Txt>}
      {!range && <Txt color={c.danger}>Take the range test first so PerfectPath knows your voice.</Txt>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  picker: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5 },
  pickerText: { flex: 1 },
  fileName: { fontSize: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkLabel: { flex: 1 },
  progress: { gap: 12 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepLabel: { fontFamily: fonts.medium },
});
