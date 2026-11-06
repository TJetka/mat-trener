# Decisions

- **2026-11-06 — Documentation:** concise English per owner; student UI remains Polish.
- **D5 correction:** the supplied 2025 key and [official PDF](https://jersz.pl/wp-content/uploads/2025/12/AM-2025-KLUCZ-POP.pdf) give **C/B/A/B** for 1/11/21/30 in class 4P. PRD v1.1 says C/A/D/C. Use the verified PDF. The PDF has text letters, not graphical marks.
- **Publication:** owner instructed “Just use them and say what is the source.” Record this decision and attribution; do not claim an open license.
- **Architecture:** static Vite/TypeScript, local KaTeX assets, Python standard-library importer using Poppler. No backend, accounts, analytics or daily history.
- **Deployment:** GitHub Pages at `/mat-trener/`. No Sites hosting. Owner follow-up authorizes pushing and online publication/testing; the Pages workflow is now prepared locally.
- **2026-11-06 — Pages repair:** branch/root publication served the source HTML instead of the compiled app. The owner switched Pages to GitHub Actions. Regenerated the incomplete npm lockfile from the registry (same direct dependency pins), including integrity hashes and Linux native packages; a regression check rejects incomplete entries. Publish only the workflow's validated `dist/` artifact.
- **2026-11-06 — Learning feedback:** owner's follow-up supersedes the PRD's final-only scoring: show the current score after every answer selection, change or clear in all modes. Keep official answers in final review. Display topic labels, distinct correct/wrong/blank colors and symbols, and a header mode-choice action with confirmation before abandoning an active attempt.
