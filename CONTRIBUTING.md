# Contributing

Thanks for helping. The bar for changes is: every example still builds, every rendered
slide still looks intentional, and the agent-facing docs stay short.

## Set up

```bash
npm install
npm test                                   # builds examples/*.json into out/
sh scripts/render.sh out/pitch-deck.pptx out/render
```

Look at `out/render/*-sheet.png` after any layout change. The overflow estimator is a
heuristic; the render is the truth.

## Adding a slide type

1. Implement `types.<name> = (slide, s, pres) => { … }` in `scripts/build_deck.js`.
   Use the helpers (`chrome`, `bottomStack`, `columns`, `txt`, `rect`, `chip`, `image`).
   Light slides call `chrome()` first and `bottomStack()` to learn where content must end.
2. Only use tokens from `T`; never hard-code colours or fonts.
3. Document the fields in `references/slide-types.md` with a JSON snippet.
4. Add the type to one example spec and a 640-px-wide render to `docs/gallery/`.
5. Mention it in `SKILL.md` only if the agent needs a rule to choose it well.

## Changing the design system

Geometry and type scale live in `references/design-system.md` and in the constants at the
top of `build_deck.js`. Change both together, rebuild all examples, and compare the
contact sheets before and after.

## Writing for the agent

`SKILL.md` is read by a model on every deck job. Keep it under ~120 lines: rules, not
prose; limits with numbers; the workflow in order. Long reference material goes in
`references/`.

## Pull requests

- One topic per PR. Include before/after renders for layout changes.
- Run `npm test` before pushing; CI runs the same command.
