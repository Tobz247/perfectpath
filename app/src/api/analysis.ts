import { File } from 'expo-file-system';
import type { VocalLine } from '../range/types';

export type AnalysisKind = 'song' | 'score';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
const ENDPOINTS: Record<AnalysisKind, string> = { song: '/analyze', score: '/analyze-score' };

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
}

/** Uploads a song or MusicXML score and returns the vocal lines the server found. */
export async function analyzeFile(kind: AnalysisKind, file: PickedFile): Promise<VocalLine[]> {
  const form = new FormData();
  // Expo's fetch can't upload React Native's { uri } file parts; it needs a part
  // that can hand over its bytes.
  const source = new File(file.uri);
  const part = { name: file.name, type: file.mimeType ?? 'application/octet-stream', bytes: () => source.bytes() };
  form.append('file', part as unknown as Blob);
  form.append('rights_confirmed', 'true');

  let response: Response;
  try {
    response = await fetch(`${API_URL}${ENDPOINTS[kind]}`, { method: 'POST', body: form });
  } catch (e) {
    console.warn(`Upload to ${API_URL} failed:`, e);
    throw new Error("Couldn't reach the PerfectPath server. Check your connection and try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.detail ?? `Analysis failed (error ${response.status}).`);
  }
  return body.lines as VocalLine[];
}
