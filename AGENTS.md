# AGENTS.md — slides-skill

This repository is itself an agent skill: `SKILL.md` is the instruction file agents load
when a user asks for a deck. When working *on* this repo (not using it), follow these rules.

## Layout

- `SKILL.md` — agent-facing instructions. Keep short; rules and limits, no essays.
- `scripts/build_deck.js` — the renderer. Design tokens, chrome and every slide type.
- `scripts/render.sh` — LibreOffice → PDF → PNG + contact sheet for visual QA.
- `scripts/build_examples.js` — builds all `examples/*.json`; this is `npm test` and CI.
- `references/` — slide field reference, design system, storyline skeletons.
- `examples/` — three specs with previews in `docs/previews/`; gallery in `docs/gallery/`.

## Rules

- Content lives in specs; layout lives in the script. Never add per-slide positioning to
  the JSON format.
- Colours and fonts come from theme tokens only.
- Any layout change: run `npm test`, render at least one example, and look at the sheet.
- Examples must stay fictional. Do not commit real customer, school or company material.
- Keep `SKILL.md`, `references/slide-types.md` and `build_deck.js` in sync when adding or
  changing a slide type.
