# Slide types and fields

Light slides accept: `title`, `subtitle`, `section`, `source`, `note`, `callout`, `notes`.
`note` may be a string (ink, 17.25 pt) or `{ "text": "...", "muted": true }` (grey caveat).
Content starts higher when `subtitle` is omitted.

## `cover` (dark)
```json
{ "type": "cover", "title": "Harbor Tutor", "subtitle": "two\nlines", "body": "one or two lines",
  "byline": "Seed round  |  September 2026",                 // or "milestone": { "label": "Next milestone", "text": "…" }
  "date": "9 September 2026",                                // small grey line when there is no footer band
  "image": "hero.png",                                       // optional, right half
  "footer": { "org": "HARBOR LABS × CITY SCHOOLS", "line": "Team update  |  8 Sep 2026", "meta": "scope note" } }   // optional white band (also shown when a logo exists)
```

## `section` (dark) — divider with a big number
```json
{ "type": "section", "number": "01", "title": "The problem", "subtitle": "one line" }   // number auto-increments if omitted
```

## `cards` — 2–4 panels
```json
{ "type": "cards", "numbering": "1" | "01" | "none", "divider": false,
  "cards": [ { "heading": "…", "body": "≤3 lines", "emphasis": "bold closing line", "image": "optional.png" } ] }
```
`numbering: "01"` + `divider: true` = decision agenda. `image` replaces the number chip (team photos, product shots); it is cropped to a 16:9-ish strip (`fit: "cover"`), pass `"fit": "contain"` per card to letterbox instead.

## `bullets` — 1–2 columns of marked items (max ~6 per column)
```json
{ "type": "bullets", "numbered": true,
  "items": [ "plain item", { "text": "bold lead", "detail": "grey second line" } ],   // single column
  "columns": [ { "heading": "Founders", "items": [ … ] }, { "heading": "Advisors", "items": [ … ] } ] }   // or two columns
```
Use for agendas, questions, team lists, recaps. Not for paragraphs. With ≤ 3 items add a
`callout` or use two columns so the lower half of the slide is not empty.

## `table` — header row + hairline rows
```json
{ "type": "table", "columns": ["Option", "Who handles returns", "Cost"], "widths": [1, 1.2, 0.9],
  "first_col_bold": true, "rows": [ ["…", "…", "…"] ] }
```
≤ 5 rows, ≤ 2 lines per cell. Comparisons, feedback → change, risks / owners.

## `stats` — 2–4 big numbers, optional dark banner and note lines
```json
{ "type": "stats", "stats": [ { "value": "30 / 30", "label": "…", "detail": "definition + [n]" } ],
  "banner": "honest framing sentence", "note": "line 1\nline 2" }
```

## `flow` — left-to-right process (2–5 steps)
```json
{ "type": "flow", "steps": [ { "heading": "…", "body": "…" } ],
  "branches": [ { "heading": "…", "body": "…" } ],                       // optional, stacked in the last slot
  "banner": { "heading": "Behind the scenes", "body": "a • b • c" },   // optional dark band
  "statement": "one bold sentence", "cards": [ { "heading": "…", "body": "…" } ] }   // optional, technical variant
```

## `timeline` — 3–6 milestones on a line
```json
{ "type": "timeline", "items": [ { "label": "Q3 2026", "heading": "Seed close", "body": "$2.5M", "state": "done" | "now" | "next" } ] }
```

## `chart` — native, editable chart with optional side panel
```json
{ "type": "chart", "chart": "col" | "bar" | "line" | "area" | "pie" | "doughnut",
  "labels": ["Cycle 1", "Cycle 2"], "series": [ { "name": "Loopwell", "values": [3.4, 2.2] } ],
  "format": "$0.0", "min": 0, "max": 5, "show_values": true,
  "side": { "heading": "Why it drops", "body": "…" } }      // or "insight": "…" for the default heading
```
Series colours: accent, ink, greys. Keep ≤ 3 series, ≤ 8 categories.

## `image` — picture with text (side `right` | `left` | `full`)
```json
{ "type": "image", "image": "box.png", "side": "left", "fit": "contain" | "cover", "caption": "…",
  "heading": "Built for 40 cycles", "body": "paragraph", "points": ["…", "…"] }
```

## `quote` — one big statement or quotation
```json
{ "type": "quote", "text": "\"…\"", "attribution": "Oke (1982)", "size": 27 }
```

## `options` — excerpt on the left, choices on the right
```json
{ "type": "options", "tag": "TEACHER CHOICE", "headline": "…",
  "excerpt": { "tag": "…", "heading": "…", "subheading": "…", "body": "…" },
  "right_heading": "Then the user decides", "options": [ { "label": "…", "text": "…" } ] }
```

## `next` (dark) — next steps / the ask / summary
```json
{ "type": "next", "title": "…", "subtitle": "two\nlines",
  "cards": [ { "heading": "…", "body": "…", "detail": "grey qualifier" } ],   // 2–3 cards
  "banner": "one bold sentence on accent", "footer_label": "The ask", "source": "…" }
```

## `references`
```json
{ "type": "references", "section": "References", "columns_count": 2,
  "entries": [ { "label": "[1] NOAA ISD", "text": "…", "link": { "text": "ncei.noaa.gov", "url": "https://…" } },
               { "label": "[3] City evaluations", "text": "…", "link": "plain grey qualifier" } ] }
```
≤ 6 entries.

## `closing` (dark)
```json
{ "type": "closing", "title": "Questions?", "body": "one line", "lines": ["name · email", "site"] }
```
