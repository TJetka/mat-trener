import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publicationAssets } from '../../narzedzia/public-assets.mjs';
import { fixtureBank } from '../fixtures/bank.ts';

test('only approved reachable images ship; stale files and source PDFs stay out', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mat-trener-assets-'));
  try {
    const bank = fixtureBank();
    const file = 'rysunki/authored/figure.svg';
    bank.tasks[0].options.C = [{ type: 'image', file, alt: 'Authored square' }];
    mkdirSync(join(dir, 'rysunki/authored'), { recursive: true });
    writeFileSync(join(dir, file), '<svg/>');
    writeFileSync(join(dir, 'rysunki/authored/stale.svg'), '<svg/>');
    writeFileSync(join(dir, 'raw.pdf'), 'private PDF');
    writeFileSync(join(dir, 'bank.json'), JSON.stringify(bank));
    assert.deepEqual([...publicationAssets(dir).keys()], ['bank.json', file]);
    bank.tasks[0].options.C = [{ type: 'image', file: '../raw.pdf', alt: 'invalid' }];
    writeFileSync(join(dir, 'bank.json'), JSON.stringify(bank));
    assert.throws(() => publicationAssets(dir), /Invalid image path/);
  } finally { rmSync(dir, { recursive: true }); }
});
