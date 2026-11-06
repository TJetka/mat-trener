# Source audit — 2026-11-06

- Supplied directory: 40 PDFs; paired papers/keys for 2005–2019 and 2021–2025. No 2020 pair.
- Seven keys (2005–2011) lack useful text and need OCR/manual reading. Inventory and SHA-256 hashes: local `lokalne/inwentaryzacja.json`.
- Imported 2024 and 2025: 30 tasks each, all five options, paper pages 1–2, key page 1. All text and key cells compared with PDF renders. Neither paper has task/option illustrations.
- 2025 D5 correction: questions 1/11/21/30 are **C/B/A/B**, not the PRD example. See [decisions](decisions.md).
- Rules: paper headers confirm 75 minutes and quarter-point penalties; [JERSZ §8](https://jersz.pl/konkurs/alfik-matematyczny/) specifies starting points equal to question count. The current rules page is 2026/27; source editions and rule version are recorded separately.
- Publication follows the owner's instruction to use the materials and attribute the source. Exact document URLs/hashes are in `dane/edycje/`; the app shows paper/key links.

| Group | 2024 | 2025 |
|---|---:|---:|
| Numbers | 9 | 4 |
| Geometry | 3 | 4 |
| Logic | 6 | 9 |
| Combinatorics | 5 | 1 |
| Measures/data | 7 | 12 |

Boundary decisions: 2024/28 is combinatorics (double counting); 2025/25 is numbers (remainders); calendar/clock tasks are measures. These groups describe the decisive step, not the story setting. All 60 tasks passed the historical-bank browser rendering check; desktop and 360px screenshots were reviewed on 2026-11-06.

## Archive expansion

All 18 remaining class-IV papers (540 questions) and their keys were compared with PDF renders. The checked-in bank now contains 600 tasks across 20 complete editions. Scanned keys from 2005–2011 were transcribed visually; later key columns were extracted spatially and checked visually. The November 2021 key is on page 3 of the source report.

Preserved 33 diagram/option crops in 2005–2011. Crop coordinates and two masks removing adjacent prose are recorded per task; the diagram content is unchanged. Clock superscripts use readable HH:MM text. Removed publisher footers accidentally captured in the last option; repaired two printed word wraps in 2005. Original source files remain local and unchanged.

2012/14 accepts D or E. The official 2018/16 cancellation awards full credit for A–E and blank. Both exceptions retain exact source references and are covered by scoring/validation tests. No answers were inferred by solving. Source hashes, extraction configuration, Poppler version and preparation Git SHA: `dane/audyty/archiwum-2026-11-06.json`.
