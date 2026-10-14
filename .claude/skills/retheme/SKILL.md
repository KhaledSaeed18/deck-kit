---
name: retheme
description: The design pass for this deck kit. Gives the deck a new visual identity (palette, fonts, shapes, layouts, diagram styling, presenter and chrome) by editing only src/theme/** and the notes-PDF palette, then verifies contrast, fit and offline fonts. Use when the user wants a new look, a brand or university style, light or dark mode, different fonts, or "make it look like X".
---

# Retheme

The design lives entirely in `src/theme/`. Content (`src/slides/`) and the engine never change
in this pass. At the end, `git diff --stat` should list only `src/theme/**`, `package.json` and
`pnpm-lock.yaml` (font packages), and `scripts/export-notes-pdf.ts` (its palette block).

## 1. Direction

- Read the "Design direction" section of `docs/brief.md`, and ask the speaker only for what is
  missing: mood or references, colours, fonts, light or dark projector.
- If the `frontend-design` skill is available, use its guidance for an intentional direction
  rather than a template look.
- Look at the current state first: `pnpm shots`, then view `out/shots/`.
- Projectors wash out colour and contrast: prefer strong ink on light paper or the reverse,
  body text at least the `--fs-body` token (32 px on the 1920x1080 canvas), and no thin
  hairlines or light grey text.

## 2. How the theme is built

| File | Holds |
|---|---|
| `tokens.css` | Every value: colours, patches, borders, radii, shadows, textures, fonts, type scale, spacing, durations, diagram tokens |
| `fonts.css` | `@import` of the bundled `@fontsource*` packages |
| `base.css` | Slide canvas, headings, text, tables, figures, focus ring |
| `content.css` | Component classes used by the slides (cards, `.question`, `.takeaways`, `.refs`, …) |
| `types/layouts.css` | Per-`data-type` layout |
| `diagrams.css` | `dgm-*` SVG classes |
| `chrome.css` | Progress bar, counter, jump chip, overview, help, blackout |
| `presenter.css` | The presenter window |

Rules:
- Change values in `tokens.css` first; most redesigns are mostly token work. Keep the token
  names (the engine and other files refer to them); add new tokens when you need them.
- Every visual value lives in `src/theme/`, as a token or in a rule that uses tokens. No colours
  or fonts anywhere else (a unit test scans the engine, entries and slides).
- Fragments: keep `visibility: hidden` as the hiding mechanism (the engine owns it). Style
  `[data-fragment-state="current"]` if the newest step should stand out.
- Keep `prefers-reduced-motion` working: the `@media (prefers-reduced-motion: reduce)` block at the
  end of `tokens.css` zeroes the duration tokens; keep it, and use those tokens for any motion.
- Print: each slide carries its own background (`print-color-adjust: exact` is set).

## 3. Fonts (offline)

- Use fonts with an open licence from Fontsource: `pnpm add @fontsource-variable/<name>` (or
  `@fontsource/<name>` for static fonts), import them in `fonts.css`, and point `--font-head`,
  `--font-sans` and `--font-mono` at the family names, with system fallbacks.
- Remove font packages the theme no longer uses (`pnpm remove …`).
- Never use Google Fonts URLs or any remote `@import`.

## 4. Notes PDF

`scripts/export-notes-pdf.ts` styles the printed presenter script on its own: update the
`:root` palette block and the two `@font-face` paths to match the new theme.

## 5. Verify, and iterate

1. `pnpm check`: the literals test proves no visual values leaked outside the theme.
2. `pnpm test:deck`: axe colour contrast on every slide, every slide still fits the canvas, the
   PDF still has one page per slide, nothing is fetched from the network.
3. `pnpm shots`, then look at every image in `out/shots/`, including the `-step1` builds and
   `presenter.png`. Also check the overview (O), help (?) and blackout (B) in `pnpm dev`, or ask
   the speaker to.
4. `pnpm test:engine` only if you touched selectors the engine relies on (it runs on the
   example deck's own theme, so it normally stays green).

Report the direction you took, the before and after for two or three slides (paths to the
shots), and the check output. **Stop** for the speaker's review.
