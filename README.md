# Deck kit

An offline, self-hosted HTML presentation kit with a real presenter view. You write slides as
small HTML files; the engine handles the rest: keyboard and clicker control, step-by-step
builds, a synced presenter window with notes and a pace timer, overview, blackout, print to PDF,
and a single-file build you can run from a USB stick with Wi-Fi off.

It comes with Claude Code skills that take a new talk from brief to finished deck, with a review
stop after each phase.

## Start a new talk

1. On GitHub, click **Use this template** (or clone the repo), then:
   ```sh
   pnpm install
   pnpm dev            # http://localhost:5173, and /presenter.html for the presenter view
   ```
   You will see the starter deck, which demonstrates every slide type and feature.
2. In Claude Code, from the repo folder, run **`/new-deck`**. It asks about your topic,
   audience, length, sources and look, then works in phases:

   | Phase | What happens | You review |
   |---|---|---|
   | 0. Brief | Fills `docs/brief.md`: narrative and slide plan | the plan |
   | 1. Research and plan | Subagents research and adversarially verify every fact; `docs/fact-log.md`, `docs/plan.md` with numbered questions | answer the flags |
   | 2. Content | Writes the slides, speaker notes, Q&A, diagrams, profiles and timings; lint, browser checks and screenshots | the slides |
   | 3. Verify | Fact check, copy check, timing, rehearsal script PDF | the report |
   | 4. Design | `/retheme`: new palette, fonts and layouts, only in `src/theme/` | the look |

   Other skills: **`/add-slide`**, **`/retheme`**, **`/ship-deck`** (final checks, PDFs, the
   files for the USB stick).

You can also write slides by hand: see [`docs/authoring.md`](docs/authoring.md).

## Features

- **Fixed 1920x1080 canvas**, scaled to any screen with letterboxing. Layouts never reflow.
- **Build steps** (`data-fragment`): table rows, cards and diagram parts appear in order, and
  hidden items keep their space.
- **Presenter window** (P): current slide at its live step, next slide, notes with the script
  for the current step highlighted, Next line, acronyms and likely questions, elapsed timer
  (survives a refresh), wall clock, per-slide target and ahead/behind pace.
- **Two-way sync** between the windows, over BroadcastChannel, with a `window.opener` fallback so
  it also works from `file://` in Firefox.
- **Profiles**: several versions of one talk (`?profile=short`), each with its own order and
  timings; backup slides after the end.
- **URL keeps your place** (`#/5/2`): refresh and the back button work.
- **Overview grid** (O), **blackout** (B), **jump** to slide N, **help** overlay (?), **hide
  chrome** (H), **fullscreen** (F), swipe on touch screens.
- **Offline by construction**: fonts, icons and scripts are bundled; tests block the network.
- **Print**: Ctrl/Cmd+P gives one slide per page with every step shown; `pnpm pdf` does it for
  each profile; `pnpm notes:pdf` prints the speaker script, one A4 page per slide.
- **Slide lint** in `pnpm check` and as a live overlay in `pnpm dev`: one heading per slide,
  word limit, copy voice, a script for every step, accessible tables and SVGs, no inline styles,
  no remote resources, icons from the whitelist.
- **Accessible**: live region announces each slide, hidden slides are inert, axe runs on every
  slide in the test suite.

## Keys

| Action | Keys |
|---|---|
| Next | Right, Down, Space, PageDown, Enter, left click, swipe left |
| Previous | Left, Up, PageUp, Backspace, swipe right |
| First / last | Home / End |
| Jump | type the slide number, then Enter (G shows the chip) |
| Fullscreen | F (Esc also exits) |
| Overview | O (arrows move, Enter or click jumps) |
| Blackout | B or . |
| Presenter | P |
| Help | ? |
| Hide chrome | H (remembered across reloads) |

Letters match the physical key, so they work on AZERTY and Arabic layouts. Ctrl, Cmd and Alt
shortcuts go to the browser. Clickers send PageUp/PageDown, so they work out of the box.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Authoring server with live reload and the slide-lint overlay |
| `pnpm dev:example` | The bundled example deck |
| `pnpm build` | Static multi-page build in `dist/` (deck and `presenter.html`) |
| `pnpm build:single` | One self-contained `dist-single/deck.html` that opens by double-click |
| `pnpm preview` | Serves `dist/` on http://127.0.0.1:4175 |
| `pnpm check` | Typecheck, Biome lint, unit tests, slide lint |
| `pnpm test:deck` | Your deck in a real browser: fits the canvas, axe, print, offline |
| `pnpm test:engine` | The engine contract, run against the example deck |
| `pnpm test:e2e` | Both suites |
| `pnpm shots [profile]` | Screenshots of every slide and the presenter in `out/shots/` |
| `pnpm pdf` | `out/deck-<profile>.pdf` for every profile |
| `pnpm notes:pdf [profile]` | `out/presenter-script.pdf` |
| `pnpm notes:md` | `docs/presenter-script.md` |

First run of the browser tests: `pnpm exec playwright install chromium webkit`.

## Running it in the room (fallback order)

1. **`pnpm preview`** (or any static server on `dist/`, for example
   `python3 -m http.server -d dist`). Open the deck and press **P** for the presenter window.
2. **`dist-single/deck.html` from a USB stick.** Double-click it; **P** opens
   `deck.html?role=presenter`. Sync works on `file://` in Chrome and Safari, and in Firefox
   through the opener fallback.
3. **The PDF** from `pnpm pdf`.

A plain `dist/index.html` opened by double-click will not run: browsers block module scripts on
`file://`. Use option 1 or 2.

## Layout

```
src/
  engine/      the engine: never edited per deck; no visual values (a test enforces it)
  slides/      one HTML partial per slide: content and semantic markup only
  theme/       every visual value, as tokens; the design pass touches only this
  assets/      icons.ts: the lucide icon whitelist
  deck.ts      slide order, profiles, target times
examples/wifi/ a complete real deck: worked example, and the engine's e2e fixture
docs/          authoring.md, templates/, and per deck: brief, decisions, plan, fact log
.claude/skills/ new-deck, add-slide, retheme, ship-deck
```

Stack: pnpm, Vite 8, strict TypeScript 7, vanilla DOM, Biome, Vitest, Playwright. No UI
framework and no presentation library. Node 22.12 or later.

## Credits

The example deck, "Wireless Networks by Coverage and the Evolution of Wi-Fi", was made for
CENG645 Mobile Communication (LIU), Fall 2026. Fonts: Archivo Black and Space Grotesk (SIL OFL
1.1) through Fontsource. Icons: Lucide (ISC).
