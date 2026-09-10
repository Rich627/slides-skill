# Changelog

## 0.2.0 — 2026-09-09

First public release.

- 15 slide types: cover, section, cards, bullets, table, stats, flow (with branches /
  statement / small cards), timeline, chart, image, quote, options, next, references, closing.
- Seven theme presets with per-token overrides; `onAccent` handled per preset.
- CJK-aware overflow estimator and chip sizing; font override for CJK decks.
- Images fitted by reading pixel dimensions (LibreOffice ignores pptxgenjs `contain`).
- `render.sh` produces PDF, per-slide PNGs and a contact sheet for visual QA.
- Three worked examples (pitch deck, class report, team update) built by `npm test`.
