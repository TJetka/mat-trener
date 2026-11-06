# Delivery status

Implemented: 600 source-checked tasks across all 20 available class-IV editions (2005–2019, 2021–2025), three modes, timed sessions, recovery, official scoring, answer review and image zoom.

Follow-up UI: correct/wrong/blank responses have distinct colors and symbols; named topic tags appear during questions and review; scores update after every selection/change/clear; a header action returns to mode choice after confirming an active attempt. Source years are visible for historical date context.

Archive review: all paper pages and class-IV key columns checked; 33 diagram crops retained. The 2012/14 key accepts D or E. The annulled 2018/16 receives full official credit even when blank and is excluded from training/mix. Source URLs, hashes, crop coordinates and review approvals are recorded in `dane/`.

Validation: 40 pytest and 23 Node checks pass, along with Ruff, TypeScript, production build and release checks. All 10 browser acceptance checks pass, covering every historical question, mobile diagrams, live feedback, recovery and official key exceptions.

Delivery: coherent commits on `main`, normal SSH pushes to `git@github.com:TJetka/mat-trener.git`. GitHub Pages uses the existing GitHub Actions workflow to publish validated `dist/` at <https://tjetka.github.io/mat-trener/>. Raw PDFs and generated artifacts remain excluded. No workflow changes were needed for this update.

Offline review copy: run `node narzedzia/offline-preview.mjs` after a build, then open `lokalne/podglad.html`. This is not the deployment artifact.

Explanations milestone: reviewed Polish guides for 2015–2019 and 2021–2025 (300 tasks), shown only for wrong answers in the final review. Guides have independent content approvals bound to the approved question/key version; older saved sessions remain readable. Remaining archive guides are in progress. New validation: 47 pytest and 24 Node checks, lint/build, and the mobile explanation/reload journey pass.
