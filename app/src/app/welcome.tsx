import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, colors } from '../components/ui';

const STEPS = [
  ['Measure your voice', 'A two-minute range test finds your lowest, highest and most comfortable notes.'],
  ['Bring in a song', 'Upload a song you own or a choir score.'],
  ['Get your part', 'See which part suits your voice best, and whether a key change would help.'],
];

export default function Welcome() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title}>PerfectPath</Text>
        <Text style={styles.tagline}>Find the right part to sing in any song.</Text>
        {STEPS.map(([heading, detail], index) => (
          <View key={heading} style={styles.step}>
            <Text style={styles.number}>{index + 1}</Text>
            <View style={styles.stepText}>
              <Text style={styles.heading}>{heading}</Text>
              <Text style={styles.detail}>{detail}</Text>
            </View>
          </View>
        ))}
      </View>
      <Button title="Start the range test" onPress={() => router.push('/range-test')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'space-between' },
  body: { marginTop: 48, gap: 20 },
  title: { fontSize: 36, fontWeight: '800', color: colors.primary },
  tagline: { fontSize: 18, color: colors.text, marginBottom: 12 },
  step: { flexDirection: 'row', gap: 14 },
  number: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, textAlign: 'center', lineHeight: 32, fontWeight: '700', color: colors.primary },
  stepText: { flex: 1 },
  heading: { fontSize: 17, fontWeight: '700', color: colors.text },
  detail: { fontSize: 15, color: colors.muted, lineHeight: 21, marginTop: 2 },
});
