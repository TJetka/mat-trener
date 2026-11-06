import { readFileSync } from 'node:fs';
import katex from '../src/vendor/katex/katex.mjs';

const bank = JSON.parse(readFileSync(process.argv.includes('--stdin') ? 0 : 'public/bank.json', 'utf8'));
for (const task of bank.tasks) {
  for (const [part, nodes] of Object.entries({ stem: task.stem, ...task.options })) {
    for (const node of nodes) {
      if (node.type === 'math') {
        try {
          katex.renderToString(node.text, { displayMode: node.display, throwOnError: true, trust: false, strict: 'error' });
        } catch (error) {
          throw new Error(`${task.id} (${part}): ${error.message}`);
        }
      }
    }
  }
}
