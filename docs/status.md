# Delivery status

Implemented: scaffold, pinned environments, import/review/validation pipeline, 60 source-checked tasks, taxonomy, three modes, unbiased sampling, tab recovery, deadline checks, quarter-point scoring, answer review and image zoom.

Verified: clean registry-backed `npm ci`, 30 pytest checks + 19 Node checks, Ruff, TypeScript compilation, bank completeness, public-asset filtering, production build and release check. All five browser acceptance tests passed with Playwright Chromium; desktop and 360px screenshots reviewed.

Git/SSH access restored on 2026-11-06 using elevated execution. Initial implementation committed as `85ba34e` and pushed to `git@github.com:TJetka/mat-trener.git` on `main`, which tracks `origin/main`. Raw PDFs, local data and generated artifacts remain excluded.

Pages repair: the branch/root publisher served uncompiled source HTML, while the app workflow failed on an incomplete npm lockfile. The lockfile now has registry metadata and Linux dependencies; the owner switched Pages to GitHub Actions. Workflow code is unchanged.

Next: push the repair, confirm the workflow publishes `dist/`, then check the live `/mat-trener/` application.

Offline review copy: run `node narzedzia/offline-preview.mjs` after a build, then open `lokalne/podglad.html`. It embeds the bank and fonts; it is not the deployment artifact.
