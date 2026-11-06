// Offline bootstrap from the locally installed, MIT-licensed KaTeX distribution.
// Usage: node narzedzia/vendor-katex.mjs /path/to/notebook-out /path/to/typescript-5/lib/typescript.js
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const source = process.argv[2];
if (!source) throw new Error('Pass a local directory containing katex.js and fonts');
const ts = (await import(process.argv[3] ? pathToFileURL(process.argv[3]).href : 'typescript')).default;
if (!ts.createSourceFile) throw new Error('Provide a local TypeScript compiler-API module as the second argument; the native TypeScript 7 CLI has no AST API.');
const original = readFileSync(join(source, 'katex.js'), 'utf8');
const ast = ts.createSourceFile('katex.js', original, ts.ScriptTarget.Latest, true);
const statements = ast.statements.filter(ts.isVariableStatement);
// The first declaration is the CommonJS helper; the second is self-contained KaTeX.
const names = statements.slice(0, 2).map(s => s.declarationList.declarations[0].name.getText(ast));
if (names.join(',') !== 'tn,rn') throw new Error('Unknown bundle; review before extraction');
const module = statements.slice(0, 2).map(s => s.getText(ast)).join('\n');
const destination = 'src/vendor/katex';
mkdirSync(destination, { recursive: true });
writeFileSync(join(destination, 'katex.mjs'), `// KaTeX 0.16.21, MIT. See LICENSE.\n${module}\nexport default rn();\n`);
// The installed distribution includes WOFF2 only; remove nonexistent legacy fallbacks.
const css = readFileSync(join(source, 'katex.min.css'), 'utf8')
  .replace(/,url\([^)]*\.(?:woff|ttf)\) format\([^)]*\)/g, '');
writeFileSync(join(destination, 'katex.min.css'), css);
cpSync(join(source, 'fonts'), join(destination, 'fonts'), { recursive: true });
writeFileSync(join(destination, 'provenance.json'), JSON.stringify({
  package: 'katex', version: '0.16.21', license: 'MIT',
  origin: 'Visual Studio Code, markdown-math extension, notebook-out',
  upstream: 'https://github.com/KaTeX/KaTeX',
  sourceSha256: createHash('sha256').update(original).digest('hex'),
}, null, 2) + '\n');
