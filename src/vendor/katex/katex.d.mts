declare const katex: {
  version: string;
  renderToString(text: string, options: {
    displayMode?: boolean; throwOnError?: boolean; trust?: boolean; strict?: string;
  }): string;
};
export default katex;
