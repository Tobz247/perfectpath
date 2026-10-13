import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RangeProvider } from '../state/RangeContext';

export default function RootLayout() {
  return (
    <RangeProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'PerfectPath' }} />
        <Stack.Screen name="range-test" options={{ title: 'Range test' }} />
        <Stack.Screen name="analyze" options={{ title: 'Find your part' }} />
      </Stack>
      <StatusBar style="auto" />
    </RangeProvider>
  );
}
