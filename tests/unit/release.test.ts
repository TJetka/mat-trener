import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertReleaseBank } from '../../narzedzia/release-check.mjs';
import { fixtureBank } from '../fixtures/bank.ts';

test('release requires a complete year plus approved tasks in a second year', () => {
  const bank = fixtureBank();
  assert.doesNotThrow(() => assertReleaseBank(bank));
  bank.tasks = bank.tasks.filter(t => !t.editionId.includes('2024'));
  assert.throws(() => assertReleaseBank(bank), /two years/);
});

test('partial second year is accepted, two partial years are not enough', () => {
  const bank = fixtureBank();
  bank.tasks = bank.tasks.filter(t => !t.editionId.includes('2024') || t.number === 1);
  bank.editions.filter(e => e.year === 2024).forEach(e => { e.complete = false; });
  assert.doesNotThrow(() => assertReleaseBank(bank));
  bank.editions.forEach(e => { e.complete = false; });
  assert.throws(() => assertReleaseBank(bank), /complete year/);
});
