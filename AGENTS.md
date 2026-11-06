# Working agreements

- Product UI: Polish. Documentation: concise English. Follow `PRD.md`; source evidence wins over a mistaken example. Record discrepancies in `docs/decisions.md`.
- Keep browser logic in `src/`, PDF IO in `narzedzia/`, editable bank sources in `dane/`. Never edit generated `public/bank.json`.
- Use strict TypeScript, typed Python, pathlib, small functions and explicit imports. Python: Ruff. No heavy dependency without justification.
- Every feature/fix needs small deterministic tests. Run the relevant pytest/Node subset; run `npm test`, `npm run lint`, and `npm run build` for core/IO changes. Browser tests cover user journeys.
- Unit fixtures are authored; bank acceptance checks may read checked-in records. No network, secrets, personal data or historical PDF fixtures. Never read `.env` or credentials.
- Imported content starts as a draft. Approval binds content, key and source hashes. Changed sources require a new proposal and review; preserve corrections.
- Record artifact config, input hashes, tool version, seed where applicable, and Git SHA when available. Never infer official answers by solving questions.
- Attribute historical content. Raw PDFs remain local. Publish only records with an explicit publication decision and completed review.
- Do not overwrite/delete source data, force-push, rebase, delete branches, or modify CI/CD without explicit authorization.
- Commit small coherent milestones and push normally when Git/network permissions allow. Report blockers accurately.
- Update the short status/backlog after each milestone. Do not add speculative features or long documentation.
