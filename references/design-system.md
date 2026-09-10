# Design system

Canvas: `LAYOUT_WIDE` 13.333 × 7.5 in. Side margin 0.5 in → content width 12.333 in.
All text boxes use `margin: 0`, left aligned, vertically centred unless noted.

## Colour tokens (hex, no `#`)

| token     | value    | use |
|-----------|----------|-----|
| `ink`     | `191919` | dark backgrounds (cover, next, banners), primary text |
| `muted`   | `555555` | subtitle, section label, footer, secondary detail |
| `accent`  | `FFC627` | kicker chip, number chips, arrows, callout edge, gold rules, `next` banner |
| `panel`   | `F5F5F2` | card / step / option fills |
| `rule`    | `D5D5D0` | hairlines (0.01 in) under headers, between rows, above references |
| `callout` | `FFF4CD` | takeaway bar fill |
| `white`   | `FFFFFF` | page, cover footer band, `next` cards |
| `link`    | `2A5DB0` | underlined reference links only |

`onAccent` (default `191919`) is the text colour used on accent chips and banners.

Presets (`theme: "name"`): `gold` (default, above), `navy` 1F3A93, `forest` 2E7D4F,
`coral` E4573D, `violet` 6A4C93, `sky` 1E88E5, `mono` 191919. Each preset also sets
`onAccent`, `callout`, `panel` and `link`. Override any token with
`{ "preset": "navy", "accent": "…" }`. Keep tints light: callout ≈ 10% accent on white.

## Typography (Calibri; sizes in pt)

| role | size | weight | colour |
|------|------|--------|--------|
| kicker / number chip | 12 | bold | ink on accent |
| section label | 12 | regular, UPPERCASE | muted |
| slide title (action title) | 27 | bold | ink |
| subtitle | 15.75 | regular | muted |
| card heading | 21.75 | bold | ink |
| step / stat label / banner text | 19.5 – 18.75 | bold | ink or white |
| body | 18 / 17.25 | regular | ink |
| emphasis line in card | 17.25 | bold | ink |
| stat value | 45 | bold | ink |
| callout | 16.5 | bold | ink |
| note above callout | 17.25 (ink) or 15.75 (muted caveat) | regular | |
| reference label / text / link | 18 bold / 15.75 / 13.5 | | |
| footer source | 10.5 | regular | muted |
| page number | 12 | regular | muted, right aligned |
| cover title / subtitle / body | 40.5 / 27 / 18.75 | bold / bold / regular | white |

## Chrome geometry (light slides), inches

| element | x | y | w | h |
|---------|---|---|---|---|
| kicker chip | 0.50 | 0.25 | auto (≥0.44) | 0.31 |
| section label | 1.96 | 0.25 | 8.33 | 0.31 |
| logo | 11.08 | 0.18 | 1.43 | 0.56 |
| title | 0.50 | 0.75 | 12.33 | 0.58 |
| subtitle | 0.50 | 1.39 | 12.33 | 0.42 |
| content area | 0.50 | 1.96–2.2 | 12.33 | down to 5.7 (note + callout) / 6.3 (callout only) / 6.85 (neither) |
| note | 0.50 | 5.91 | 12.33 | 0.45 |
| callout bar | 0.50 | 6.50 | 12.33 | 0.45 (accent edge 0.06 wide) |
| footer rule | 0.50 | 7.07 | 12.33 | 0.01 |
| source | 0.50 | 7.15 | 11.72 | 0.23 |
| page number | 12.34 | 7.12 | 0.49 | 0.25 |

Panels: inner padding 0.19 in; gap between columns 0.17 in (cards) / 0.33 in (stats,
references) / 0.5 in (flow, arrow 0.32 × 0.23 centred in the gap).

## Principles

- One accent colour, used only for structure signals (chips, arrows, edges), never text.
- Action titles; subtitle states scope or source; callout states the takeaway.
- Every claim slide has a bracketed source in the footer that maps to the References slide.
- Caveats are visible on the slide ("not a live transcript", "live state unverified"),
  not hidden in notes.
- Dark slides bracket the story (cover, next milestone); appendix slides stay light.
- Line breaks are authored (`\n`) so each line reads as a phrase.
