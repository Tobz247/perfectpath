import { File } from 'expo-file-system';
import type { VocalLine } from '../range/types';

export type AnalysisKind = 'song' | 'score';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
// Songs take minutes, so they run as a background job the app polls; scores are quick.
const ENDPOINTS: Record<AnalysisKind, string> = { song: '/jobs', score: '/analyze-score' };
const POLL_MS = 2000;

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
}

/** Where a song analysis has got to: `step` indexes into `steps` (-1 while waiting to start). */
export interface Progress {
  steps: string[];
  step: number;
}

async function request(path: string, init?: RequestInit): Promise<any> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, init);
  } catch (e) {
    console.warn(`Request to ${API_URL}${path} failed:`, e);
    throw new Error("Couldn't reach the PerfectPath server. Check your connection and try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.detail ?? `Analysis failed (error ${response.status}).`);
  }
  return body;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Uploads a song or MusicXML score and returns the vocal lines the server found. */
export async function analyzeFile(
  kind: AnalysisKind,
  file: PickedFile,
  onProgress: (progress: Progress) => void = () => {},
): Promise<VocalLine[]> {
  const form = new FormData();
  // Expo's fetch can't upload React Native's { uri } file parts; it needs a part
  // that can hand over its bytes.
  const source = new File(file.uri);
  const part = { name: file.name, type: file.mimeType ?? 'application/octet-stream', bytes: () => source.bytes() };
  form.append('file', part as unknown as Blob);
  form.append('rights_confirmed', 'true');

  const started = await request(ENDPOINTS[kind], { method: 'POST', body: form });
  if (kind === 'score') return started.lines as VocalLine[];

  for (;;) {
    await wait(POLL_MS);
    const job = await request(`/jobs/${started.id}`);
    onProgress({ steps: job.steps, step: job.step });
    if (job.done) {
      if (job.error) throw new Error(job.error);
      return job.lines as VocalLine[];
    }
  }
}
