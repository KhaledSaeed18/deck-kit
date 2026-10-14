---
name: new-deck
description: Turn this deck kit into a new presentation on any topic. Runs intake, research and planning, content, verification and design in phases, stopping for the speaker's review after each. Use when the user wants to start a new talk, deck, lecture or presentation from this repo, or says "new deck", "new presentation", or "make slides about X".
---

# New deck

Builds one talk in this repo, end to end, in phases. The engine (navigation, presenter view,
sync, print, lint) is finished and never changes; only `src/slides/`, `src/deck.ts`,
`src/assets/icons.ts`, `src/theme/` and `docs/` do.

Before starting, read `CLAUDE.md` and `docs/authoring.md`. Open two or three slides in
`examples/wifi/slides/` to see the bar for slides and notes: script per step, Next line,
acronyms, likely questions with answers, sources.

**Stop at the end of every phase** and wait for the speaker's review. Never carry on into the
next phase in the same turn.

## Where are we?

Check the state first and resume from the right phase:
- No `docs/brief.md`: Phase 0.
- Brief, but no `docs/plan.md`: Phase 1.
- Plan approved (`docs/decisions.md` has entries), and `src/slides/` still holds the starter
  deck (`data-id="idea"` in `02-idea.html`): Phase 2.
- Content written: Phase 3, then Phase 4.

## Phase 0: Brief

1. Gather what the brief needs. If the speaker has already pasted an outline, a brief, lecture
   notes or files, read them first and only ask about what is missing. Ask in one round, with
   AskUserQuestion where the options are clear-cut:
   - topic and working title; speaker name(s) exactly as shown; event or course; date
   - audience and what they already know; the goal of the talk
   - length, and whether a shorter version (second profile) is needed
   - sources: files (put them in `docs/source/`, never in the deck), links, required references
   - language and spelling
   - design direction: mood, colours, fonts, light or dark projector (or "decide later")
2. Copy `docs/templates/brief.md` to `docs/brief.md` and fill it. Draft the narrative and a
   slide plan yourself: one idea per slide, about 1 minute per slide on average, title first,
   references and questions last. Mark every draft line you invented, as opposed to what the
   speaker gave you, so they can see it.
3. Copy `docs/templates/decisions.md` and `docs/templates/fact-log.md` into `docs/`.
4. Set `src/deck.ts` `id` (kebab-case) and `title`, and `package.json` `name` and `description`.
   Rewrite the README's first paragraph for this talk, keeping the rest.

**Stop.** Show the brief's narrative and slide plan; ask for corrections.

## Phase 1: Research and plan

1. List every factual claim the plan needs: numbers, dates, names, definitions, quotes.
2. Research with subagents in parallel, one per topic area (sonnet). Each returns claims with
   primary sources (standards, papers, official docs, the speaker's own material first; vendor
   blogs and Wikipedia only as pointers), exact figures, dates and caveats.
3. Verify adversarially: one opus subagent per research batch tries to break each claim
   (outdated, misquoted, wrong unit, marketing figure, needs a qualifier). Keep only what
   survives; record disputes.
4. Write `docs/fact-log.md` (one id per claim) and `docs/research/references.md`.
5. Write `docs/plan.md`:
   - slide table: number, `data-id`, `data-type`, on-screen draft (about 30 words), build steps,
     target time, profiles
   - profiles and their total times; backup slides
   - diagrams to draw, described in one line each
   - **numbered flags** (C1, C2, …) wherever research contradicts or sharpens the brief, each
     with a recommendation and the fact-log ids behind it
   - structure questions (S1, S2, …): cuts, merges, exempt slides, anything else to decide

**Stop.** Ask the speaker to answer each flag ("ok" accepts the recommendation). Record the
answers in `docs/decisions.md`, with date and source, before writing any slide.

## Phase 2: Content

1. Remove the starter deck: delete `src/slides/*.html`. Write the new slides following
   `docs/authoring.md` exactly. Number the files in talk order (`01-title.html`, …).
2. Content comes from the brief as amended by `docs/decisions.md`, and nothing else. If a slide
   needs wording that was not approved, write it, mark the element with `data-todo="why"`, and
   list it in your report.
3. Notes for every slide: Script with one block per step (spoken sentences, simple words),
   Next, Acronyms when there are any, If asked with 2 to 4 likely questions, and a `<details>`
   block with sources (fact-log ids), extra Q&A and timing. Use `data-profile` lines where a
   profile skips the following slide.
4. Diagrams: hand-drawn inline SVG, `dgm-*` classes. Add new classes to
   `src/theme/diagrams.css` with neutral styling that uses the existing tokens.
5. Icons: add what you use to `src/assets/icons.ts`; remove starter icons nothing uses.
6. Update `src/deck.ts`: every profile, in order, with target times that add up to the brief.
7. Check, and fix until clean:
   - `pnpm check` (typecheck, Biome, unit tests, slide lint)
   - `pnpm test:deck` (every slide fits the canvas, axe, one PDF page per slide, offline)
   - `pnpm shots`, then look at every image in `out/shots/`: overflow, cramped text, empty
     space, a diagram that does not read. Fix layout problems with markup structure or theme
     classes, never with inline styles.

**Stop.** Report: slide list with times per profile, every `data-todo`, anything you could not
fit, and the output of the checks (paste failures, do not summarise them away).

## Phase 3: Verify

1. Adversarial fact check (opus subagent): every on-screen number and claim, and every "If
   asked" answer, against `docs/fact-log.md` and its sources. Report mismatches; fix only what
   is a transcription error, and flag the rest.
2. Copy check (haiku subagent): the voice rules in `docs/authoring.md`, spelling consistency,
   and that each slide's Script covers what is on screen at each step.
3. Timing: the target times per profile add up to the brief's length, with about a minute
   spare for questions.
4. Build the rehearsal material: `pnpm notes:pdf` (and per profile if there are several).
5. Run `pnpm test:e2e` once, so the engine suite has run on this machine too.

**Stop.** Report each check with its real output.

## Phase 4: Design

Run the `/retheme` skill with the brief's design direction. **Stop** after it for review.

Then suggest `/ship-deck` for the final build and the files to take to the room.

## Notes

- Commit only when the speaker asks. Good commit points are the end of each phase.
- If the speaker wants to change content later, use `/add-slide` or edit slides directly, and
  record content changes in `docs/decisions.md`.
