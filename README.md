# Mat-Trener

Polish, static Alfik Mathematics trainer for grade IV. Includes 60 source-checked tasks from 2024–2025, three test modes, timed sessions and answer review. No accounts, backend or saved history.

## Run

Requires Node 24, Python 3.11 and [uv](https://docs.astral.sh/uv/). PDF import also needs Poppler (`pdftotext`, `pdftoppm`).

```sh
npm ci
uv sync --frozen
npm run dev
```

Open the printed URL under `/mat-trener/`.

```sh
npm test                 # Python and TypeScript tests
npm run lint
npm run build           # validate, type-check, package dist/
npx playwright install chromium
npm run test:e2e         # local request interception; no external services
```

## Layout

| Directory | Purpose |
|---|---|
| `src/` | UI, random sampling, deadlines, scoring |
| `dane/` | Editable edition manifests, LaTeX tasks, taxonomy |
| `narzedzia/` | Import, validation, review and build tools |
| `tests/` | Authored fixtures and acceptance tests |
| `lokalne/`, `public/`, `dist/` | Ignored local/generated artifacts |

See [adding a year](docs/import.md), [status and blockers](docs/status.md), [stories](docs/backlog.md) and [source audit](docs/data-audit.md).

GitHub Pages must use **Settings → Pages → Source → GitHub Actions**. The existing workflow validates the app and publishes only `dist/` to <https://tjetka.github.io/mat-trener/>. Publishing the repository root directly serves uncompiled TypeScript and leaves the loading message on screen.

Tasks and official answers: **Łowcy Talentów JERSZ**, [Alfik archive](https://jersz.pl/konkurs/alfik-matematyczny/). Each edition records exact URLs, PDF hashes and the owner's publication instruction. Raw PDFs remain local. KaTeX 0.16.21 and WOFF2 fonts are vendored under their included MIT notice; runtime requests use no CDN.
