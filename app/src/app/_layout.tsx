import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HistoryProvider } from '../state/HistoryContext';
import { RangeProvider } from '../state/RangeContext';
import { fonts, useTheme } from '../theme';

export default function RootLayout() {
  const c = useTheme();
  const [fontsLoaded] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });
  if (!fontsLoaded) return null;

  return (
    <RangeProvider>
      <HistoryProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.background },
            headerTintColor: c.text,
            headerTitleStyle: { fontFamily: fonts.semibold },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: c.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
