import katex from './vendor/katex/katex.mjs';
import type { ContentNode } from './types.ts';

export const base = import.meta.env.BASE_URL;

export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  result.className = className;
  if (text) result.textContent = text;
  return result;
}

export function button(text: string, action: () => void, className = 'button'): HTMLButtonElement {
  const node = element('button', className, text);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

export function zoom(file: string, alt: string): void {
  const dialog = element('dialog', 'image-dialog');
  dialog.setAttribute('aria-label', 'Powiększony rysunek');
  const close = button('Zamknij rysunek', () => dialog.close());
  const picture = element('img');
  picture.src = base + file;
  picture.alt = alt;
  dialog.append(close, picture, element('p', '', alt));
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

export function content(nodes: ContentNode[], withZoom = true): DocumentFragment {
  const fragment = document.createDocumentFragment();
  for (const node of nodes) {
    if (node.type === 'text') {
      fragment.append(element('span', 'prose', node.text));
    } else if (node.type === 'math') {
      const math = element('span', node.display ? 'math-block' : 'math');
      // Only KaTeX-generated markup enters innerHTML; source text never does.
      math.innerHTML = katex.renderToString(node.text, { displayMode: node.display,
        throwOnError: true, trust: false, strict: 'error' });
      fragment.append(math);
    } else {
      const figure = element('figure');
      const img = element('img', 'task-image');
      img.src = base + node.file;
      img.alt = node.alt;
      figure.append(img);
      if (withZoom) figure.append(button('Powiększ rysunek ↗', () => zoom(node.file, node.alt), 'text-button'));
      fragment.append(figure);
    }
  }
  return fragment;
}
