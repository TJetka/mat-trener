# Delivery status

Implemented: scaffold, pinned environments, import/review/validation pipeline, 60 source-checked tasks, taxonomy, three modes, unbiased sampling, tab recovery, deadline checks, quarter-point scoring, answer review and image zoom.

Verified: 30 pytest checks + 18 Node checks, Ruff, TypeScript compilation, bank completeness, public-asset filtering, production build and release check. Four of five browser acceptance tests passed with installed Chrome; Chrome closed during the historical-bank test, so the full browser suite remains incomplete.

Git/SSH access restored on 2026-11-06 using elevated execution. Initial implementation committed as `85ba34e` and pushed to `git@github.com:TJetka/mat-trener.git` on `main`, which tracks `origin/main`. Raw PDFs, local data and generated artifacts remain excluded.

Remaining blockers:

- Node versions are pinned from installed packages; a clean registry-backed `npm ci` and lockfile integrity refresh remain unverified.
- Playwright's bundled browser is absent. Installed Chrome passed the user journeys, including the 360px layout test, but closed during the historical-bank test. Full browser/visual acceptance is pending.
- Pages publication is unverified. The owner's follow-up authorizes pushing and online publication/testing; the existing `.github/workflows/pages.yml` is included unchanged.

Next: verify a clean install → complete browser/visual acceptance → verify Pages Actions and the live `/mat-trener/` URL.

Offline review copy: run `node narzedzia/offline-preview.mjs` after a build, then open `lokalne/podglad.html`. It embeds the bank and fonts; it is not the deployment artifact.
