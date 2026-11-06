// Produce a network-free review copy of the production build. Never deploy this file.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const build = resolve('dist');
const html = readFileSync(resolve(build, 'index.html'), 'utf8');
const scriptPath = html.match(/<script[^>]*src="\/mat-trener\/([^\"]+)"[^>]*><\/script>/)?.[1];
const cssPath = html.match(/<link[^>]*href="\/mat-trener\/([^\"]+\.css)"[^>]*>/)?.[1];
if (!scriptPath || !cssPath) throw new Error('Run npm run build first');
const script = readFileSync(resolve(build, scriptPath), 'utf8');
const css = readFileSync(resolve(build, cssPath), 'utf8').replace(/url\(\/mat-trener\/([^)]*)\)/g, (_, path) => {
  return `url(data:font/woff2;base64,${readFileSync(resolve(build, path)).toString('base64')})`;
});
const bank = readFileSync(resolve(build, 'bank.json'), 'utf8');
// JSON serialization prevents source text from terminating the enclosing script tag.
const json = JSON.stringify(bank).replace(/</g, '\\u003c');
const bootstrap = `window.fetch=async url=>{if(String(url).endsWith('/bank.json'))return new Response(${json},{headers:{'Content-Type':'application/json'}});throw new Error('Offline preview: external request blocked')};`;
const result = html
  .replace(/<script[^>]*src="[^\"]+"[^>]*><\/script>/, () => `<script>${bootstrap}</script><script type="module">${script.replace(/<\/script/gi, '<\\/script')}</script>`)
  .replace(/<link[^>]*href="[^\"]+\.css"[^>]*>/, () => `<style>${css}</style>`);
mkdirSync('lokalne', { recursive: true });
writeFileSync('lokalne/podglad.html', result);
console.log('Offline review copy: lokalne/podglad.html');
