import type { SessionMeta, TranscriptBlock } from './types';

// 所有 15 場的 meta 打包進主 bundle（體積小）
const metaModules = import.meta.glob<SessionMeta>(
  '../content/sessions/*/meta.json',
  { eager: true, import: 'default' }
);

export const allSessionMetas: SessionMeta[] = Object.values(metaModules)
  .sort((a, b) => a.order - b.order);

export function getSessionMeta(id: string): SessionMeta | undefined {
  return allSessionMetas.find(m => m.id === id);
}

// analysis.md 和 transcript.json 用 dynamic import（lazy load）
export async function loadAnalysis(id: string): Promise<string> {
  const mod = await import(`../content/sessions/${id}/analysis.md?raw`);
  return mod.default;
}

export async function loadTranscript(id: string): Promise<TranscriptBlock[]> {
  const mod = await import(`../content/sessions/${id}/transcript.json`);
  return mod.default;
}
