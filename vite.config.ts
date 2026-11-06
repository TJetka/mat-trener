import { defineConfig } from 'vite';
import { publicationAssets } from './narzedzia/public-assets.mjs';

export default defineConfig({
  base: '/mat-trener/',
  build: { copyPublicDir: false },
  plugins: [{
    name: 'approved-bank-only',
    apply: 'build',
    generateBundle() {
      for (const [fileName, source] of publicationAssets('public')) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  }],
});
