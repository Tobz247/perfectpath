import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HistoryProvider } from '../state/HistoryContext';
import { RangeProvider } from '../state/RangeContext';

export default function RootLayout() {
  return (
    <RangeProvider>
      <HistoryProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'PerfectPath' }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="range-test" options={{ title: 'Range test' }} />
          <Stack.Screen name="your-voice" options={{ title: 'Your voice', headerBackVisible: false }} />
          <Stack.Screen name="analyze" options={{ title: 'Find your part' }} />
          <Stack.Screen name="result/[id]" options={{ title: 'Your part' }} />
        </Stack>
        <StatusBar style="auto" />
      </HistoryProvider>
    </RangeProvider>
  );
}
