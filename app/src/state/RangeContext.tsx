import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SingerRange } from '../range/types';

const STORAGE_KEY = 'perfectpath.singerRange.v1';

interface RangeState {
  range: SingerRange | null;
  loaded: boolean;
  saveRange: (range: SingerRange) => Promise<void>;
}

const RangeContext = createContext<RangeState | null>(null);

/** Keeps the singer's measured range on the phone so they only test once. */
export function RangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<SingerRange | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => stored && setRange(JSON.parse(stored) as SingerRange))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const saveRange = useCallback(async (next: SingerRange) => {
    setRange(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  return <RangeContext.Provider value={{ range, loaded, saveRange }}>{children}</RangeContext.Provider>;
}

export function useSingerRange(): RangeState {
  const state = useContext(RangeContext);
  if (!state) throw new Error('useSingerRange must be used inside RangeProvider');
  return state;
}
