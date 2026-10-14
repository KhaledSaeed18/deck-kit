# Deck kit: project rules

An offline, self-hosted HTML presentation: a fixed engine (keyboard and clicker control,
fragments, presenter window with sync, overview, blackout, print, single-file build, slide lint)
plus one deck's content and design. Each copy of this repo is one talk.

## Read first
- `docs/brief.md`: this deck's content source of truth (created by `/new-deck` from
  `docs/templates/brief.md`). If it does not exist yet, this copy still holds the starter deck:
  suggest `/new-deck`.
- `docs/decisions.md`: the speaker's approved answers. Where they conflict with the brief, the
  decisions win.
- `docs/authoring.md`: the slide format, notes structure, lint rules, icons, SVG rules, manifest.
- `docs/fact-log.md` and `docs/research/`: verified facts. Check here before researching again.
- `examples/wifi/`: a complete, finished deck. Copy its patterns (notes depth, Q&A, diagrams).

## Skills
- `/new-deck`: the whole workflow for a new talk, in phases with a review stop after each.
- `/add-slide`: add or rewrite one slide.
- `/retheme`: the design pass (touches only `src/theme/**` and SVG class styling).
- `/ship-deck`: final verification and the files to take to the room.

## Hard rules
- **Never change slide content, facts or numbers from the brief on your own.** Apply only
  approved changes from `docs/decisions.md`. Flag anything else, and mark unapproved on-screen
  text with `data-todo="why"` (the lint fails until it is resolved).
- **No runtime network requests.** No CDNs, remote fonts or remote images. Fonts come from
  `@fontsource*` packages, icons from `lucide`, images live in the repo. The deck must run with
  Wi-Fi off.
- **Keep the three layers separate** (tests enforce it):
  - `src/engine/` has no visual literals and is not edited per deck. Engine changes need
    `pnpm test:engine` to pass.
  - `src/slides/` holds content and semantic markup only.
  - `src/theme/` holds every visual value as a token.
- **Never edit `examples/wifi/`**: it is the engine's test fixture.
- **Stack:** pnpm, Vite 8, strict TypeScript 7 (no `any`, enforced by Biome), vanilla DOM. No UI
  framework and no presentation library.
- **Icons** come from `lucide`, hydrated from `<i data-icon="name">`. Never emoji or
  pictographic Unicode.
- **On-screen copy voice:** no emoji, no em dashes, no exclamation marks. Arrows are icons. About
  30 words per slide, except slides marked `data-wordcount="exempt"`. Detail goes in the notes.
- **Diagrams** are hand-authored inline SVG with `dgm-*` classes, a `<title>`, and no paint
  attributes. Never copy vendor diagrams or screenshots.

## Working style
- Work in phases (Brief, Research and plan, Content, Verify, Design) and **stop for the
  speaker's review at the end of each phase**.
- Delegate research and verification to subagents, with a model matched to the stakes: opus
  for high-stakes facts and adversarial verification, sonnet for standard work, haiku for
  mechanical checks.
- Commit or push only when the speaker asks.
- Report honestly: if a check fails or is skipped, say so and show the output.

## Commands
- `pnpm dev` (open `/presenter.html` alongside), `pnpm build`, `pnpm build:single`, `pnpm preview`
- `pnpm check` (typecheck, lint, unit tests, slide lint)
- `pnpm test:deck` (your deck in a browser), `pnpm test:engine`, `pnpm test:e2e` (both)
- `pnpm pdf`, `pnpm notes:pdf [profile]`, `pnpm notes:md`
- `pnpm dev:example` shows the bundled example deck
- `pnpm media` regenerates the README images in `docs/media/` (sources in `docs/media/src/`)
