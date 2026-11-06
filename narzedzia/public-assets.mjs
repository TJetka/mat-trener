import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Select only the compiled bank and images reachable from its published records. */
export function publicationAssets(directory) {
  const raw = readFileSync(resolve(directory, 'bank.json'));
  const bank = JSON.parse(raw.toString('utf8'));
  const files = new Set(bank.tasks.flatMap(t => [t.stem, ...Object.values(t.options)]
    .flat().filter(n => n.type === 'image').map(n => n.file)));
  const assets = new Map([['bank.json', raw]]);
  for (const file of files) {
    if (!/^rysunki\/[a-z0-9-]+\/[a-zA-Z0-9_.-]+$/.test(file)) throw new Error(`Invalid image path: ${file}`);
    assets.set(file, readFileSync(resolve(directory, file)));
  }
  return assets;
}
