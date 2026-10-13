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
  // React Native's FormData accepts a file descriptor object in place of a Blob.
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
  form.append('rights_confirmed', 'true');

  let response: Response;
  try {
    response = await fetch(`${API_URL}${ENDPOINTS[kind]}`, { method: 'POST', body: form });
  } catch {
    throw new Error("Couldn't reach the PerfectPath server. Check your connection and try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.detail ?? `Analysis failed (error ${response.status}).`);
  }
  return body.lines as VocalLine[];
}
