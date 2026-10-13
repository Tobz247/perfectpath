import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { analyzeFile, type AnalysisKind, type PickedFile } from '../api/analysis';
import { Button, colors } from '../components/ui';
import { useHistory } from '../state/HistoryContext';
import { useSingerRange } from '../state/RangeContext';

const COPY: Record<AnalysisKind, { title: string; intro: string; pickTypes: string[]; extensions: string[]; wait: string }> = {
  song: {
    title: 'Find your part in a song',
    intro: 'Pick a song file you own. PerfectPath separates the vocals, measures them and deletes the audio afterwards.',
    pickTypes: ['audio/*'],
    extensions: ['.mp3', '.m4a', '.wav', '.flac', '.ogg', '.aac'],
    wait: 'Separating the vocals. This can take a minute or two.',
  },
  score: {
    title: 'Find your part in a choir piece',
    intro: 'Pick the score as a MusicXML file (.musicxml, .xml or .mxl). Most notation apps and choir libraries can export it.',
    pickTypes: ['*/*'],
    extensions: ['.musicxml', '.xml', '.mxl'],
    wait: 'Reading the score.',
  },
};

export default function Analyze() {
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const kind: AnalysisKind = kindParam === 'score' ? 'score' : 'song';
  const copy = COPY[kind];
  const { range } = useSingerRange();
  const { addEntry } = useHistory();

  const [file, setFile] = useState<PickedFile | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    try {
      const lines = await analyzeFile(kind, file);
      const title = file.name.replace(/\.[^.]+$/, '');
      const entry = await addEntry({ title, kind, lines });
      router.replace({ pathname: '/result/[id]', params: { id: entry.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.intro}>{copy.intro}</Text>

      <Button title={file ? `Change file (${file.name})` : 'Choose a file'} variant="secondary" onPress={pick} disabled={busy} />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: rightsConfirmed }}
        style={styles.checkRow}
        onPress={() => setRightsConfirmed((value) => !value)}
      >
        <View style={[styles.checkbox, rightsConfirmed && styles.checkboxOn]}>
          {rightsConfirmed && <Text style={styles.tick}>✓</Text>}
        </View>
        <Text style={styles.checkLabel}>I own this file or have the right to use it.</Text>
      </Pressable>

      <Button title="Find my part" onPress={analyze} disabled={!file || !rightsConfirmed || busy || !range} />

      {busy && (
        <View style={styles.busy}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.intro}>{copy.wait}</Text>
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      {!range && <Text style={styles.error}>Take the range test first so PerfectPath knows your voice.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  intro: { fontSize: 16, color: colors.muted, lineHeight: 22 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary },
  tick: { color: '#fff', fontWeight: '700' },
  checkLabel: { flex: 1, fontSize: 15, color: colors.text },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  error: { color: colors.danger, fontSize: 15 },
});
