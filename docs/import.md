# Add a year

1. Keep the PDF pair outside the public tree. Register it using an existing edition as a template:

```sh
uv run python -m narzedzia.cli przygotuj-import \
  --template dane/edycje/alfik-2025-4-sp-pl.json --year 2026 \
  --paper /path/to/paper.pdf --key /path/to/key.pdf \
  --paper-url https://example.org/paper.pdf --key-url https://example.org/key.pdf \
  --section 'klasa 4P' --heading 'klasa 4 szkoły podstawowej' \
  --output lokalne/import-2026.json
```

2. In that manifest, verify expected numbers/points, duration, starting score, penalty, class and variant against the edition's sources. Set `reguly_sprawdzone: true`. Add `publikacja` with `decyzja`, `podstawa` and `zadania` (numbers or `"wszystkie"`). These decisions are deliberately not inherited.
3. Run `npm run importuj -- --manifest lokalne/import-2026.json`. The importer creates drafts. The exact key heading matters: **4P in 2025; 4SP in 2024**.
4. Compare every `zadanie.tex` stem and A–E option with the rendered PDF. Check every official key cell. Set one `grupa` and one `tag` from `dane/slowniki/tematy.json`. Never solve a task to fill a missing official answer.
5. Approve each reviewed record:

```sh
uv run python -m narzedzia.cli zatwierdz \
  --id alfik-2026-4-sp-pl-001 --reviewer 'Reviewer name' \
  --note 'Checked paper p.1 and class 4P key row 1; all options match.'
npm run sprawdz:dane
npm run build
```

The source format is one `tresc`, then `wariant` A–E; math uses `\(...\)`/`\[...\]`. Images use `\rysunek{local.png}{Descriptive Polish alt text}`. For print, copy `narzedzia/szablon.tex` beside a task and run LuaLaTeX there.

Repeated identical imports preserve edits. Changed sources create immutable proposals under `dane/propozycje/`; publication stops until the affected edition is reconciled and reviewed again. Preserve the previous version before accepting a proposal. Schedules, scans, graphical keys and diagram-heavy layouts require manual transcription/OCR and visual verification; the text importer rejects unreadable material instead of guessing.

Report: `raporty/bank.json`. Incomplete years still supply approved training tasks; they are excluded from full-year selection. Drafts remain explicitly excluded. Editing approved content, sources, images or rules invalidates its approval hash.

For an official alternative-answer ruling, retain the primary `klucz.litera` and list all accepted letters in `klucz.litery`. For an annulled question with explicitly awarded full credit, add its number to edition `anulowane`, set `klucz.litera: null`, `klucz.pelny_kredyt: true` and record the ruling in `klucz.uwagi`. Such questions remain in complete years but never enter training/mix. Unresolved cancellations cannot be published as answered questions.

## Explanations

Add `wyjasnienie.json` beside an approved task, with `schema: 1`, `tekst` (20–1600 characters) and `autor`. After checking the reasoning against the question and official key, run `uv run python -m narzedzia.cli zatwierdz-wyjasnienie --id TASK_ID --reviewer NAME --note NOTE`. Approval binds both the guide text and the current source-task hash. A changed question, key or guide fails the build until reviewed again. Explanations are authored plain text; math symbols and line breaks are supported without executing HTML or TeX.
