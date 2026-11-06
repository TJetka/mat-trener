import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The public launch needs one complete year and usable tasks from at least two years. */
export function assertReleaseBank(bank, profileId = 'alfik/4-sp') {
  const editions = bank.editions.filter(e => e.profileId === profileId && e.grades.includes(4));
  const usable = editions.filter(e => bank.tasks.some(t => t.editionId === e.id));
  if (new Set(usable.map(e => e.year)).size < 2) throw new Error('Release needs approved tasks from at least two years');
  if (!usable.some(e => e.complete && e.expected.every(q =>
    bank.tasks.filter(t => t.editionId === e.id && t.number === q.number && t.points === q.points).length === 1))) {
    throw new Error('Release needs at least one complete year');
  }
}

function walk(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = resolve(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export function checkRelease(directory) {
  const root = resolve(directory);
  const bank = JSON.parse(readFileSync(resolve(root, 'bank.json'), 'utf8'));
  assertReleaseBank(bank);
  const publishedImages = new Set(bank.tasks.flatMap(t => [t.stem, ...Object.values(t.options)]
    .flat().filter(n => n.type === 'image').map(n => n.file)));
  for (const file of walk(root)) {
    const name = relative(root, file).replaceAll('\\', '/');
    if (/\.(pdf|tex)$/i.test(name) || /(?:^|\/)\.env/.test(name)) throw new Error(`Non-public source in release: ${name}`);
    if (name.startsWith('rysunki/') && !publishedImages.has(name)) throw new Error(`Unpublished image in release: ${name}`);
    if (name.endsWith('.css') || name === 'index.html') {
      const content = readFileSync(file, 'utf8');
      for (const [, asset] of content.matchAll(/(?:url\(|(?:src|href)=")["']?\/mat-trener\/([^"')\s>]+)/g)) {
        if (!statSync(resolve(root, asset)).isFile()) throw new Error(`Missing asset: ${asset}`);
      }
    }
  }
  for (const image of publishedImages) {
    if (!statSync(resolve(root, image)).isFile()) throw new Error(`Missing image: ${image}`);
  }
  return { tasks: bank.tasks.length, version: bank.version };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(checkRelease('dist')));
}
