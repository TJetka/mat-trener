import { expire, LETTERS } from './domain.ts';
import type { Attempt, ContentNode, Task } from './types.ts';

export const STORAGE_KEY = 'mat-trener:attempt:v1';
export interface TabStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function nodes(value: unknown): value is ContentNode[] {
  return Array.isArray(value) && value.length > 0 && value.every(n => record(n) && (
    (n.type === 'text' && typeof n.text === 'string') ||
    (n.type === 'math' && typeof n.text === 'string' && typeof n.display === 'boolean') ||
    (n.type === 'image' && typeof n.alt === 'string' && typeof n.file === 'string'
      && /^rysunki\/[a-z0-9-]+\/[a-zA-Z0-9_.-]+$/.test(n.file))));
}
function task(value: unknown): value is Task {
  if (!record(value) || !record(value.options) || !record(value.source)) return false;
  return typeof value.id === 'string' && typeof value.editionId === 'string' && Number.isInteger(value.number)
    && [3, 4, 5].includes(Number(value.points)) && typeof value.version === 'string'
    && typeof value.group === 'string' && typeof value.tag === 'string'
    && LETTERS.includes(value.answer as never) && nodes(value.stem)
    && LETTERS.every(letter => nodes((value.options as Record<string, unknown>)[letter]))
    && record(value.source.paper) && record(value.source.key)
    && Array.isArray(value.source.paper.strony) && typeof value.source.key.pozycja === 'string';
}

/** Reject damaged session snapshots; valid snapshots retain the original content and key versions. */
export function restore(raw: string, now = Date.now()): Attempt | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.schema !== 1 || typeof value.bankVersion !== 'string'
      || !record(value.profile) || typeof value.profile.id !== 'string'
      || !record(value.mode) || !['training', 'mix', 'year'].includes(String(value.mode.kind))
      || !Array.isArray(value.tasks) || !value.tasks.length || !value.tasks.every(task)
      || !Array.isArray(value.editions) || !value.editions.length
      || !record(value.answers) || !Number.isInteger(value.index)
      || Number(value.index) < 0 || Number(value.index) >= value.tasks.length
      || !Number.isFinite(value.startedAt) || !Number.isFinite(value.deadline)
      || Number(value.deadline) <= Number(value.startedAt)
      || !['active', 'finished'].includes(String(value.status))) return null;
    if (value.mode.kind === 'training' && ![3, 4, 5].includes(Number(value.mode.points))) return null;
    if (value.mode.kind === 'year' && typeof value.mode.editionId !== 'string') return null;
    for (const edition of value.editions) {
      if (!record(edition) || edition.profileId !== value.profile.id
        || typeof edition.id !== 'string' || !Number.isInteger(edition.year)
        || typeof edition.rulesVersion !== 'string' || !Array.isArray(edition.documents)
        || !edition.documents.every(d => record(d) && typeof d.id === 'string' && typeof d.url === 'string'
          && d.url.startsWith('https://'))
        || !Number.isInteger(edition.startQuarters) || !Number.isInteger(edition.penaltyQuartersPerPoint)) return null;
    }
    if (new Set(value.tasks.map(t => t.id)).size !== value.tasks.length) return null;
    if (value.mode.kind === 'year' && value.editions.length !== 1) return null;
    for (const question of value.tasks) {
      if (!value.editions.some(e => e.id === question.editionId)) return null;
      const choice = value.answers[question.id];
      if (choice !== null && !LETTERS.includes(choice as never)) return null;
    }
    if (value.status === 'active' && (value.finishedAt !== null || value.finishReason !== null)) return null;
    if (value.status === 'finished' && (!Number.isFinite(value.finishedAt)
      || !['manual', 'time'].includes(String(value.finishReason)))) return null;
    return expire(value as unknown as Attempt, now);
  } catch { return null; }
}

export function save(storage: TabStorage, attempt: Attempt): boolean {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(attempt)); return true; }
  catch { return false; }
}
