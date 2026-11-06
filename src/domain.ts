import type { Attempt, Bank, Edition, Letter, Mode, Points, Profile, Task } from './types.ts';

export const LETTERS: Letter[] = ['A', 'B', 'C', 'D', 'E'];
export type RandomWord = () => number;

export const cryptoWord: RandomWord = () => crypto.getRandomValues(new Uint32Array(1))[0];

/** Rejection sampling avoids modulo bias; the injected source makes tests deterministic. */
export function randomBelow(limit: number, random: RandomWord = cryptoWord): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > 2 ** 32) throw new Error('Invalid random range');
  const ceiling = Math.floor(2 ** 32 / limit) * limit;
  let value: number;
  do {
    value = random();
    if (!Number.isInteger(value) || value < 0 || value >= 2 ** 32) throw new Error('Invalid random word');
  } while (value >= ceiling);
  return value % limit;
}

export function shuffled<T>(items: readonly T[], random: RandomWord = cryptoWord): T[] {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1, random);
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

export function eligible(bank: Bank, profileId: string): Task[] {
  const editions = new Set(bank.editions.filter(e => e.profileId === profileId && e.grades.includes(4)).map(e => e.id));
  return bank.tasks.filter(t => editions.has(t.editionId));
}

export function completeEditions(bank: Bank, profileId: string): Edition[] {
  return bank.editions.filter(e => {
    if (!e.complete || e.profileId !== profileId || !e.grades.includes(4)) return false;
    const tasks = bank.tasks.filter(t => t.editionId === e.id);
    return tasks.length === e.expected.length && e.expected.every(
      q => tasks.filter(t => t.number === q.number && t.points === q.points).length === 1,
    );
  }).sort((a, b) => b.year - a.year);
}

export function unavailableReason(bank: Bank, profileId: string, mode: Mode): string | null {
  const pool = eligible(bank, profileId);
  if (mode.kind === 'year') {
    const years = completeEditions(bank, profileId);
    return years.some(e => mode.editionId === 'random' || e.id === mode.editionId)
      ? null : 'Ten rocznik nie ma jeszcze wszystkich sprawdzonych zadań.';
  }
  const required: [Points, number][] = mode.kind === 'training'
    ? [[mode.points, 8]] : [[3, 3], [4, 3], [5, 2]];
  for (const [points, count] of required) {
    const available = pool.filter(t => t.points === points).length;
    if (available < count) return `Poziom ${points} pkt: mamy ${available} z ${count} potrzebnych zadań.`;
  }
  return null;
}

export function startAttempt(bank: Bank, profileId: string, mode: Mode, now: number = Date.now(), random: RandomWord = cryptoWord): Attempt {
  const profile = bank.profiles.find(p => p.id === profileId && p.grades.includes(4));
  if (!profile) throw new Error('Nie znaleziono banku dla klasy IV.');
  const reason = unavailableReason(bank, profileId, mode);
  if (reason) throw new Error(reason);
  const pool = eligible(bank, profileId);
  let tasks: Task[];
  let seconds: number;
  if (mode.kind === 'year') {
    const editions = completeEditions(bank, profileId);
    const edition = mode.editionId === 'random' ? editions[randomBelow(editions.length, random)]
      : editions.find(e => e.id === mode.editionId)!;
    tasks = pool.filter(t => t.editionId === edition.id).sort((a, b) => a.number - b.number);
    seconds = edition.durationSeconds;
  } else {
    tasks = mode.kind === 'training' ? shuffled(pool.filter(t => t.points === mode.points), random).slice(0, 8)
      : shuffled(([3, 4, 5] as Points[]).flatMap(points =>
        shuffled(pool.filter(t => t.points === points), random).slice(0, points === 5 ? 2 : 3)), random);
    seconds = tasks.reduce((sum, task) => sum + profile.trainingSeconds[task.points], 0);
  }
  if (new Set(tasks.map(t => t.id)).size !== tasks.length) throw new Error('Powtórzony identyfikator zadania.');
  return structuredClone({
    schema: 1, bankVersion: bank.version, profile, mode, tasks,
    editions: bank.editions.filter(e => tasks.some(t => t.editionId === e.id)),
    answers: Object.fromEntries(tasks.map(t => [t.id, null])), index: 0,
    startedAt: now, deadline: now + seconds * 1000,
    status: 'active', finishedAt: null, finishReason: null,
  });
}

/** The sole finalization operation. Repeated calls leave the same final state untouched. */
export function finish(attempt: Attempt, now: number = Date.now()): Attempt {
  if (attempt.status === 'finished') return attempt;
  return { ...attempt, status: 'finished', finishedAt: Math.min(now, attempt.deadline),
    finishReason: now >= attempt.deadline ? 'time' : 'manual' };
}

export function expire(attempt: Attempt, now: number = Date.now()): Attempt {
  return now >= attempt.deadline ? finish(attempt, now) : attempt;
}

export function answer(attempt: Attempt, letter: Letter | null, now: number = Date.now()): Attempt {
  const current = expire(attempt, now);
  if (current.status !== 'active') return current;
  if (letter !== null && !LETTERS.includes(letter)) throw new Error('Invalid answer');
  return { ...current, answers: { ...current.answers, [current.tasks[current.index].id]: letter } };
}

export function navigate(attempt: Attempt, index: number, now: number = Date.now()): Attempt {
  const current = expire(attempt, now);
  if (!Number.isInteger(index) || index < 0 || index >= current.tasks.length) return current;
  return { ...current, index };
}

export function score(attempt: Attempt): { correct: number; wrong: number; blank: number; quarters: number; maxQuarters: number } {
  const year = attempt.mode.kind === 'year';
  const rules = attempt.editions[0];
  let quarters = year ? rules.startQuarters : 0;
  let correct = 0, wrong = 0, blank = 0;
  for (const task of attempt.tasks) {
    const choice = attempt.answers[task.id];
    if (choice === null) blank++;
    else if (choice === task.answer) { correct++; quarters += task.points * 4; }
    else { wrong++; if (year) quarters -= task.points * rules.penaltyQuartersPerPoint; }
  }
  return { correct, wrong, blank, quarters,
    maxQuarters: (year ? rules.startQuarters : 0) + attempt.tasks.reduce((sum, t) => sum + t.points * 4, 0) };
}

export function formatPoints(quarters: number): string {
  return (quarters / 4).toLocaleString('pl-PL', { maximumFractionDigits: 2 });
}

export function durationForMode(profile: Profile, mode: Mode): number {
  return mode.kind === 'training' ? 8 * profile.trainingSeconds[mode.points]
    : mode.kind === 'mix' ? 3 * profile.trainingSeconds[3] + 3 * profile.trainingSeconds[4] + 2 * profile.trainingSeconds[5] : 0;
}
