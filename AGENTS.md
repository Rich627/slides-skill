# AGENTS.md — slides-skill

This repository is itself an agent skill: `SKILL.md` is the instruction file agents load
when a user asks for a deck. When working *on* this repo (not using it), follow these rules.
Read by Codex, Cursor and Kiro directly; by Claude Code via `CLAUDE.md` and by Agy /
Antigravity via `GEMINI.md`. Edit this file only; the adapters just import it.

## Commands

```bash
npm install                                                # pptxgenjs is the only dependency; Node 18+
npm test                                                   # builds every examples/*.json into out/ and checks each .pptx is a zip; CI runs the same
node scripts/build_deck.js examples/pitch-deck.json out/pitch-deck.pptx   # build one spec
sh scripts/render.sh out/pitch-deck.pptx out/render        # PDF + per-slide PNGs + out/render/pitch-deck-sheet.png contact sheet
```

- There is no lint step or unit-test suite. The three example specs are the test.
- `build_deck.js` exit codes: `1` bad usage, unknown slide type or unknown theme preset;
  `2` pptxgenjs not installed; `3` deck was written but the overflow estimator flagged a
  text box or an image is missing. `build_examples.js` treats `3` as a pass and prints
  the warnings.
- `render.sh` needs LibreOffice (`soffice`, auto-detected on macOS, or set `SOFFICE=`)
  and `pdftoppm` from poppler. The contact sheet needs Python Pillow and is silently
  skipped without it. `DPI=` overrides the default 80.
- `out/` is git-ignored build output; never commit it.

## Layout

- `SKILL.md` — agent-facing instructions. Keep under ~120 lines; rules and limits, no essays.
- `scripts/build_deck.js` — the renderer. Design tokens, chrome and every slide type.
- `scripts/render.sh` — LibreOffice → PDF → PNG + contact sheet for visual QA.
- `scripts/build_examples.js` — builds all `examples/*.json`; this is `npm test` and CI.
- `references/` — slide field reference, design system, storyline skeletons.
- `examples/` — three specs with previews in `docs/previews/`; gallery in `docs/gallery/`.

## Architecture

The pipeline is JSON spec → `build_deck.js` → `.pptx` → `render.sh` → PNGs you look at.
Everything that matters lives in `build_deck.js`, a single-run script with module-level
state (`T`, `warnings`, `currentSlideNo`, `sectionCount`) and no exports. It is not a
library; each deck is one process.

- **Theme resolution.** `T = BASE ⊕ PRESETS[preset] ⊕ per-token overrides` from
  `spec.theme` (a preset name or an object). Every colour and the font come from `T`;
  `onAccent` is set per preset because some accents need dark text.
- **Slide type registry.** `types.<name>(slide, s, pres)` is dispatched by `s.type`;
  an unknown type exits 1. Light slides call `chrome()` first (chip, section label,
  logo, title, subtitle, footer) and `bottomStack()`, which draws the optional note and
  callout and returns the y where content must end. `contentTop(s)` gives the top, lower
  when there is no subtitle. Dark slides (`cover`, `section`, `next`, `closing`) draw
  their own chrome. `columns(n)` splits the content width for panels and cards.
- **Text.** All text goes through `txt()`, which turns `**bold**` and `\n` into
  pptxgenjs runs and calls `estimateOverflow()`, a CJK-aware em-width heuristic. Warnings
  accumulate and are printed after the file is written, producing exit code 3. The
  estimator is only a guess; the render is the truth.
- **Images.** Paths resolve relative to the spec file. `image()` reads PNG, GIF and
  JPEG headers itself to compute a contain fit, because LibreOffice ignores pptxgenjs
  `contain` sizing. A missing image becomes a grey placeholder panel plus a warning.
- **Charts** are native pptxgenjs charts, so `types.chart` is the only type that uses
  the `pres` argument.
- Canvas is `LAYOUT_WIDE` (13.333 × 7.5 in) with 0.5 in side margins. Geometry constants
  sit at the top of `build_deck.js` and are mirrored in `references/design-system.md`;
  change both together.

## Rules

- Content lives in specs; layout lives in the script. Never add per-slide positioning to
  the JSON format.
- Colours and fonts come from theme tokens only. Never hard-code a colour or font in a
  slide type.
- Any layout change: run `npm test`, render at least one example, and look at the sheet.
  Include before/after renders in the PR.
- Examples must stay fictional. Do not commit real customer, school or company material.
- Adding or changing a slide type touches four places together: `types.<name>` in
  `build_deck.js`, the field snippet in `references/slide-types.md`, one example spec,
  and a 640-px render in `docs/gallery/`. Mention it in `SKILL.md` only if the agent
  needs a rule to choose it well.
- One topic per PR. Run `npm test` before pushing.
