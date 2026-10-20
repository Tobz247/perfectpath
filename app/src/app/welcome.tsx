import { router } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { Button, IconBubble, Screen, Txt, type IconName } from '../components/ui';
import { useTheme } from '../theme';

const STEPS: [IconName, string, string][] = [
  ['mic', 'Measure your voice', 'A two-minute range test finds your lowest, highest and most comfortable notes.'],
  ['musical-notes', 'Bring in a song', 'Upload a song you own or a choir score.'],
  ['people', 'Get your part', 'See which part suits you, its sol-fa, and whether a key change would help.'],
];

export default function Welcome() {
  const c = useTheme();
  return (
    <Screen fixed edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.body}>
        {/* The logo's navy wordmark needs a light backing in dark mode. */}
        <View style={styles.logoBox}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="PerfectPath" />
        </View>
        <Txt variant="heading" style={styles.tagline}>
          Find the right part to sing in any song.
        </Txt>
        {STEPS.map(([icon, heading, detail]) => (
          <View key={heading} style={styles.step}>
            <IconBubble name={icon} color={c.primary} />
            <View style={styles.stepText}>
              <Txt variant="heading" style={styles.stepHeading}>
                {heading}
              </Txt>
              <Txt variant="muted">{detail}</Txt>
            </View>
          </View>
        ))}
      </View>
      <Button title="Start the range test" icon="mic" onPress={() => router.push('/range-test')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between', padding: 24 },
  body: { gap: 18 },
  logoBox: { borderRadius: 24, padding: 12, alignItems: 'center', backgroundColor: '#ffffff' },
  logo: { width: '80%', height: 150 },
  tagline: { textAlign: 'center', marginBottom: 4 },
  step: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  stepText: { flex: 1 },
  stepHeading: { fontSize: 16 },
});
