import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('lockfile has complete registry metadata for clean installs on every platform', () => {
  const lock = JSON.parse(readFileSync(new URL('../../package-lock.json', import.meta.url), 'utf8'));
  for (const [name, entry] of Object.entries(lock.packages)) {
    if (name === '') continue;
    const dependency = entry as { version?: string; resolved?: string; integrity?: string };
    assert.match(dependency.version ?? '', /^\d+\.\d+\.\d+/, `${name}: missing version`);
    assert.match(dependency.resolved ?? '', /^https:\/\/registry\.npmjs\.org\//, `${name}: missing registry URL`);
    assert.match(dependency.integrity ?? '', /^sha512-\S+$/, `${name}: missing integrity hash`);
  }
  for (const name of ['@rolldown/binding-linux-x64-gnu', '@typescript/typescript-linux-x64']) {
    assert.ok(lock.packages[`node_modules/${name}`], `${name}: Linux CI dependency missing`);
  }
});
