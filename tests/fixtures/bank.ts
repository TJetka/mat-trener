import type { Bank, ContentNode, Edition, Points, Task } from '../../src/types.ts';

/** Authored fixtures only. The two contests deliberately share years and task numbers. */
export function fixtureBank(): Bank {
  const bank: Bank = { schema: 1, version: 'fixture-v1', tasks: [], editions: [], profiles: [], dictionary: { grupy: {}, tagi: {} } };
  for (const [contest, category, count] of [['alfik', '4-sp', 30], ['kangur', 'maluch', 24]] as const) {
    const profileId = `${contest}/${category}`;
    bank.profiles.push({ id: profileId, contest, category, grades: [4], trainingSeconds: { 3: 90, 4: 150, 5: 210 } });
    for (const year of [2024, 2025]) {
      const id = `${contest}-${year}-${category}-pl`;
      const edition: Edition = { id, profileId, year, grades: [4], complete: true,
        expected: Array.from({ length: count }, (_, i) => ({ number: i + 1, points: (3 + Math.floor(i / (count / 3))) as Points })),
        durationSeconds: 4500, rulesVersion: 'fixture-v1', startQuarters: count * 4, penaltyQuartersPerPoint: 1,
        documents: ['arkusz', 'klucz'].map(role => ({ id: `${id}-${role}`, rodzaj: role,
          organizator: 'Authored test fixture', url: `https://example.org/${role}.pdf`, sha256: '0'.repeat(64), wersja: '1', plik: `${role}.pdf` })) };
      bank.editions.push(edition);
      for (const expected of edition.expected) {
        const text = (text: string): ContentNode[] => [{ type: 'text', text }];
        const task: Task = { id: `${id}-${String(expected.number).padStart(3, '0')}`, editionId: id,
          number: expected.number, points: expected.points, group: 'liczby', tag: 'mnozenie', version: '1',
          stem: text(`Autorskie zadanie ${expected.number}: ile to 2 + 2?`),
          options: { A: text('1'), B: text('2'), C: text('3'), D: text('4'), E: text('5') }, answer: 'D',
          source: { paper: { dokument: `${id}-arkusz`, strony: [1] },
            key: { dokument: `${id}-klucz`, strona: 1, pozycja: `sekcja test, pole ${expected.number}`, litera: 'D' } } };
        bank.tasks.push(task);
      }
    }
  }
  return bank;
}
