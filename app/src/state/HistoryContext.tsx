import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { AnalysisKind } from '../api/analysis';
import type { VocalLine } from '../range/types';

const STORAGE_KEY = 'perfectpath.history.v1';
const MAX_ENTRIES = 50;

export interface AnalysisEntry {
  id: string;
  title: string;
  kind: AnalysisKind;
  analysedAt: string;
  lines: VocalLine[];
}

interface HistoryState {
  entries: AnalysisEntry[];
  addEntry: (entry: Omit<AnalysisEntry, 'id' | 'analysedAt'>) => Promise<AnalysisEntry>;
  removeEntry: (id: string) => Promise<void>;
}

const HistoryContext = createContext<HistoryState | null>(null);

/** Keeps the pitch summaries of analysed songs (never the audio) on the phone, newest first. */
export function HistoryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<AnalysisEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => stored && setEntries(JSON.parse(stored) as AnalysisEntry[]))
      .catch(() => {});
  }, []);

  const persist = useCallback((next: AnalysisEntry[]) => {
    setEntries(next);
    return AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addEntry = useCallback(
    async (entry: Omit<AnalysisEntry, 'id' | 'analysedAt'>) => {
      const full: AnalysisEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        analysedAt: new Date().toISOString(),
      };
      await persist([full, ...entries].slice(0, MAX_ENTRIES));
      return full;
    },
    [entries, persist],
  );

  const removeEntry = useCallback((id: string) => persist(entries.filter((e) => e.id !== id)), [entries, persist]);

  return <HistoryContext.Provider value={{ entries, addEntry, removeEntry }}>{children}</HistoryContext.Provider>;
}

export function useHistory(): HistoryState {
  const state = useContext(HistoryContext);
  if (!state) throw new Error('useHistory must be used inside HistoryProvider');
  return state;
}
