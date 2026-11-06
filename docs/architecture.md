# Architecture

`PDF pair → import drafts → LaTeX/metadata review → approval hash → validated JSON/assets → Vite dist/`

- **Sources:** immutable PDF hashes; separate paper and key locations. New source versions become review proposals. A source-backed correction supersedes an incorrect PRD example.
- **Content:** constrained LaTeX parsed into text/math/image nodes. Text uses DOM text nodes; vendored KaTeX renders math with `trust: false`. Relative image files stay inside each task directory.
- **Runtime:** Fisher–Yates plus Web Crypto rejection sampling. Pools are scoped by contest/category/grade; full years additionally require exact completeness.
- **Attempts:** one `sessionStorage` snapshot per tab, including content/key/rule versions. Absolute deadline; one idempotent finalization function. No cross-day history or server.
- **Scores:** integers in quarter-points; locale formatting only at display time. Training starts at zero; full-year rules come from the edition.
- **Deployment:** static files under `/mat-trener/`, no server routes. Raw PDFs and local inspection outputs are excluded.
