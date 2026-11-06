import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { answer, completeEditions, expire, finish, formatPoints, navigate, randomBelow, score, shuffled, startAttempt, unavailableReason } from '../../src/domain.ts';
import { restore, save } from '../../src/storage.ts';
import { fixtureBank } from '../fixtures/bank.ts';
import type { Attempt, Points } from '../../src/types.ts';

const bank = fixtureBank();
const profile = 'alfik/4-sp';
const fixed = () => 0;
const ids = (a: Attempt) => a.tasks.map(t => t.id);

test('L1: training is eight distinct tasks of selected points; option order never changes', () => {
  const a = startAttempt(bank, profile, { kind: 'training', points: 4 }, 0, fixed);
  assert.equal(a.tasks.length, 8); assert.equal(new Set(ids(a)).size, 8);
  assert.ok(a.tasks.every(t => t.points === 4));
  assert.ok(a.tasks.every(t => Object.keys(t.options).join('') === 'ABCDE'));
  assert.equal(a.deadline, 20 * 60_000);
});

test('L1: mix proportions, duration and maximum', () => {
  const a = startAttempt(bank, profile, { kind: 'mix' }, 0, fixed);
  assert.deepEqual([3, 4, 5].map(p => a.tasks.filter(t => t.points === p).length), [3, 3, 2]);
  assert.equal(new Set(ids(a)).size, 8); assert.equal(a.deadline, 19 * 60_000);
  assert.equal(score(a).maxQuarters, 31 * 4);
});

test('L2: deterministic streams change samples on the same date', () => {
  const a = startAttempt(bank, profile, { kind: 'mix' }, 123456, () => 0);
  const b = startAttempt(bank, profile, { kind: 'mix' }, 123456, () => 1);
  assert.notDeepEqual(ids(a), ids(b));
  assert.deepEqual(shuffled(['a', 'b', 'c'], () => 0), ['b', 'c', 'a']);
  assert.deepEqual(shuffled(['a', 'b', 'c'], () => 1), ['a', 'c', 'b']);
});

test('L2: production crypto is invoked on every new training and random-year start', () => {
  const spy = mock.method(globalThis.crypto, 'getRandomValues', (array: Uint32Array) => { array.fill(1); return array; });
  for (const mode of [{ kind: 'mix' }, { kind: 'training', points: 3 }, { kind: 'year', editionId: 'random' }] as const) {
    const before = spy.mock.callCount(); startAttempt(bank, profile, mode);
    assert.ok(spy.mock.callCount() > before);
  }
  spy.mock.restore();
});

test('rejection sampling discards biased tail and validates its source', () => {
  const stream = [2 ** 32 - 1, 7];
  assert.equal(randomBelow(3, () => stream.shift()!), 1); assert.equal(stream.length, 0);
  assert.throws(() => randomBelow(0)); assert.throws(() => randomBelow(4, () => -1));
});

test('L3: manual year is stable and random-year selects uniformly indexed complete editions', () => {
  const a = startAttempt(bank, profile, { kind: 'year', editionId: 'alfik-2025-4-sp-pl' }, 0, fixed);
  const b = startAttempt(bank, profile, a.mode, 200, () => 99);
  assert.deepEqual(ids(a), ids(b)); assert.deepEqual(a.tasks.map(t => t.number), Array.from({ length: 30 }, (_, i) => i + 1));
  const random = startAttempt(bank, profile, { kind: 'year', editionId: 'random' }, 0, () => 1);
  assert.ok(random.tasks.every(t => t.editionId === 'alfik-2024-4-sp-pl'));
  assert.equal(a.deadline, 75 * 60_000);
});

test('D3 and shortages: partial editions feed training, unavailable modes alone are blocked', () => {
  const partial = structuredClone(bank);
  partial.tasks = partial.tasks.filter(t => t.id !== 'alfik-2025-4-sp-pl-001');
  assert.equal(completeEditions(partial, profile).length, 1);
  assert.equal(unavailableReason(partial, profile, { kind: 'mix' }), null);
  partial.tasks = partial.tasks.filter(t => t.points !== 5);
  assert.match(unavailableReason(partial, profile, { kind: 'mix' })!, /0 z 2/);
  assert.equal(unavailableReason(partial, profile, { kind: 'training', points: 3 }), null);
  assert.throws(() => startAttempt(partial, profile, { kind: 'training', points: 5 }, 0, fixed));
});

test('contest isolation includes training, mix, years and 150/120 scoring', () => {
  for (const [profileId, total] of [['alfik/4-sp', 150], ['kangur/maluch', 120]] as const) {
    for (const mode of [{ kind: 'mix' }, { kind: 'training', points: 4 }, { kind: 'year', editionId: 'random' }] as const) {
      let a = startAttempt(bank, profileId, mode, 0, fixed);
      assert.ok(a.editions.every(e => e.profileId === profileId));
      assert.ok(a.tasks.every(t => t.id.startsWith(profileId.split('/')[0])));
      if (mode.kind === 'year') {
        a = { ...a, answers: Object.fromEntries(a.tasks.map(t => [t.id, t.answer])) };
        assert.equal(score(a).quarters, total * 4); assert.equal(score(a).maxQuarters, total * 4);
      }
    }
  }
});

test('C1: snapshot retains selections, versions and absolute deadline through refresh', () => {
  let a = startAttempt(bank, profile, { kind: 'mix' }, 1_000, fixed);
  a = answer(a, 'C', 2_000); a = navigate(a, 2, 3_000);
  const recovered = restore(JSON.stringify(a), 181_000)!;
  assert.deepEqual(recovered, a); assert.equal(recovered.deadline - 181_000, 16 * 60_000);
  const expired = restore(JSON.stringify(a), a.deadline + 1)!;
  assert.equal(expired.status, 'finished'); assert.equal(expired.finishReason, 'time');
  assert.equal(finish(expired, a.deadline + 3), expired);
  assert.equal(answer(expired, 'D', a.deadline + 5), expired);
  bank.tasks[0].version = 'new'; assert.equal(a.tasks[0].version, '1');
});

test('deadline is checked before accepting an answer, including exact boundary', () => {
  const a = startAttempt(bank, profile, { kind: 'mix' }, 0, fixed);
  assert.equal(answer(a, 'D', a.deadline - 1).answers[a.tasks[0].id], 'D');
  const late = answer(a, 'D', a.deadline);
  assert.equal(late.answers[a.tasks[0].id], null); assert.equal(late.status, 'finished');
  assert.equal(expire(late, a.deadline + 1), late);
});

test('W1: official all-correct, all-wrong, blank, mixed quarter-point totals', () => {
  const base = startAttempt(bank, profile, { kind: 'year', editionId: 'random' }, 0, fixed);
  assert.equal(score(base).quarters, 120);
  const all = (letter: 'D' | 'A') => ({ ...base, answers: Object.fromEntries(base.tasks.map(t => [t.id, letter])) });
  assert.equal(score(all('D')).quarters, 600); assert.equal(score(all('A')).quarters, 0);
  let a = answer(base, 'D', 1); a = navigate(a, 20, 2); a = answer(a, 'A', 3);
  assert.deepEqual(score(a), { correct: 1, wrong: 1, blank: 28, quarters: 127, maxQuarters: 600 });
  assert.equal(formatPoints(127), '31,75');
});

test('W2: five correct, two wrong and one blank score 20/32 training points', () => {
  let a = startAttempt(bank, profile, { kind: 'training', points: 4 }, 0, fixed);
  for (let i = 0; i < 7; i++) { a = navigate(a, i, 1); a = answer(a, i < 5 ? 'D' : 'A', 2); }
  assert.deepEqual(score(a), { correct: 5, wrong: 2, blank: 1, quarters: 80, maxQuarters: 128 });
});

test('clearing/changing answers and manual finalization preserves last choice', () => {
  let a = startAttempt(bank, profile, { kind: 'mix' }, 0, fixed);
  a = answer(a, 'A', 1); a = answer(a, null, 2); assert.equal(score(a).blank, 8);
  a = answer(a, 'D', 3); a = finish(a, 4); assert.equal(a.finishReason, 'manual');
  assert.equal(answer(a, 'A', 5), a); assert.equal(score(a).correct, 1);
});

test('all three training budgets are exact', () => {
  for (const [points, minutes] of [[3, 12], [4, 20], [5, 28]]) {
    assert.equal(startAttempt(bank, profile, { kind: 'training', points: points as Points }, 0, fixed).deadline, minutes * 60_000);
  }
});

test('storage corruption, schema mismatch and quota failures do not crash', () => {
  const a = startAttempt(bank, profile, { kind: 'mix' }, 0, fixed);
  for (const invalid of ['oops', 'null', '{}', JSON.stringify({ ...a, schema: 2 }), JSON.stringify({ ...a, answers: {} })]) {
    assert.equal(restore(invalid, 1), null);
  }
  assert.equal(save({ getItem: () => null, removeItem: () => {}, setItem: () => { throw new Error('quota'); } }, a), false);
});
