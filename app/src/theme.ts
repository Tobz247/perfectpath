import { useColorScheme } from 'react-native';

/** Colours taken from the PerfectPath logo: royal blue into teal green, on navy text. */
export interface Palette {
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  background: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  onPrimary: string;
  danger: string;
  warning: string;
  good: string;
}

const light: Palette = {
  primary: '#1d4ed8',
  primarySoft: '#e3ebff',
  accent: '#10b981',
  accentSoft: '#d9f7ec',
  background: '#f6f8fc',
  card: '#ffffff',
  border: '#dfe5f0',
  text: '#0f1b3d',
  muted: '#5b6785',
  onPrimary: '#ffffff',
  danger: '#d6334a',
  warning: '#d97706',
  good: '#0f9f6e',
};

const dark: Palette = {
  primary: '#5b8cff',
  primarySoft: '#1a2a55',
  accent: '#34d399',
  accentSoft: '#123a2e',
  background: '#0b1226',
  card: '#141d38',
  border: '#24305a',
  text: '#eef2ff',
  muted: '#9aa6c7',
  onPrimary: '#ffffff',
  danger: '#ff6b81',
  warning: '#fbbf24',
  good: '#34d399',
};

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Poppins weights loaded in the root layout. */
export const fonts = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};
