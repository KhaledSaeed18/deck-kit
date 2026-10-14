# Authoring reference

Everything you need to write slides for this kit. The slide lint (`pnpm check:slides`, and an
overlay in `pnpm dev`) enforces the rules marked **lint**.

## Files

| Path | What it holds | Who edits it |
|---|---|---|
| `src/slides/NN-name.html` | One slide per file: content and semantic markup only | content work |
| `src/deck.ts` | Slide order, profiles, target times, deck title | content work |
| `src/assets/icons.ts` | Icon whitelist (lucide, imported one by one) | content work |
| `src/theme/**` | Every visual value: tokens, fonts, layouts, diagram styles | design work |
| `src/engine/**` | Navigation, presenter, sync, print, lint | never, per deck |
| `examples/wifi/` | A complete real deck: worked example and engine test fixture | never |

File names only set the load order of partials. The talk order comes from `src/deck.ts`, which
refers to slides by `data-id`. Number files in talk order anyway so the folder reads like the talk.

## A slide

```html
<section class="slide" data-type="two-column" data-id="why-it-matters" aria-labelledby="why-it-matters-h">
  <h2 id="why-it-matters-h">Why it matters</h2>
  <div class="columns">
    <article data-fragment="1">
      <h3>Cost</h3>
      <p>Half the energy per bit</p>
    </article>
    <article data-fragment="2">
      <h3>Reach</h3>
      <p>Twice the range indoors</p>
    </article>
  </div>
  <aside class="notes">
    <h3>Script</h3>
      <div data-step="0"><p>What you say when the slide appears.</p></div>
      <div data-step="1"><p>What you say when Cost appears.</p></div>
      <div data-step="2"><p>What you say when Reach appears.</p></div>
    <h3>Next</h3>
    <p>One line that bridges to the next slide.</p>
  </aside>
</section>
```

Rules:
- **lint** Exactly one root `<section class="slide">` per file.
- **lint** `data-id`: unique, kebab-case. `data-type`: one of `title`, `statement`, `two-column`,
  `three-column`, `comparison-table`, `timeline`, `diagram`, `takeaway`, `references`. The type
  is semantic; the theme lays each one out.
- **lint** Exactly one on-screen heading: `<h1>` on the `title` slide, `<h2>` everywhere else. It is
  a direct child of the section (or of its `<header>`), has an id, and the section's
  `aria-labelledby` points at it. Element ids must be unique across the whole deck, so prefix
  them with the slide id (`why-it-matters-h`).
- **lint** No `<script>`, `<style>`, `<link>`, `<iframe>`, `<object>`, `<embed>`, `<meta>`,
  `<base>`, no `style=""`, no `on*=""` handlers, no remote `src`/`href` resources (links to
  websites in `<a href>` are fine). Content never carries visual decisions.

## Fragments (build steps)

- `data-fragment="N"` hides an element until step N. Steps start at 1 and are contiguous
  (**lint**: a gap is an error). Elements that share N appear together.
- Fragments use `visibility: hidden`, so tables and layouts never reflow as rows appear.
- The newest step is marked `current`, so the theme can highlight it.
- **lint** No fragments inside the notes.
- Put fragments on `<tr>`, `<article>`, `<li>`, `<p>`, or SVG `<g>` groups.

## Speaker notes

One `<aside class="notes">` per slide, a direct child of the section. Hidden on the audience
screen; shown in the presenter window, with the block for the current step highlighted.

Sections, as `<h3>` headings in this order (all optional except Script):

| Heading | Content |
|---|---|
| `Script` | One `<div data-step="N">` per build step, from 0 (the slide as it first appears) to the slide's last step. **lint**: every step needs a block. Write it as spoken sentences. |
| `Next` | One line that bridges to the next slide. |
| `Acronyms` | `<ul class="acronyms">` of `<li><strong>ABC</strong>: full name</li>`. |
| `If asked` | Likely questions with short answers: `<li><strong>Question?</strong> Answer.</li>`. |

Then optionally a `<details><summary>More detail and sources</summary>…</details>` block with
anything for your eyes only: more questions, sources, timing. `pnpm notes:pdf` leaves it out.

**Profile-specific lines.** `<p data-profile="short">…</p>` in the notes is shown only when the
deck runs with that profile. Use it for Next lines when a profile skips the following slide.

## On-screen copy (lint)

- About 30 words on screen per slide, counted without notes or SVG titles. A slide that must hold
  more (a data table, the references) takes `data-wordcount="exempt"` on its section.
- No emoji or pictographic characters anywhere. Icons come from lucide (below).
- No em dashes, no exclamation marks.
- No arrow characters: use `<i data-icon="arrow-right"></i>`.
- Write "about" instead of `~` or `≈`, "x" instead of `×`; no `*` footnote marks (use a tag).

These rules live in `src/engine/validate.ts` (`COPY_RULES`, `WORD_LIMIT`). Change them there if
a deck needs a different voice; that is the one engine file meant to be tuned.

## Icons

- `<i data-icon="name"></i>`, always empty. The engine swaps it for an inline lucide SVG.
- **lint** The name must be in `src/assets/icons.ts`. To add one: find the PascalCase export in
  lucide (`node -e "import('lucide').then(m=>console.log('Rocket' in m))"`), import it by name,
  and add a kebab-case key to `ICONS`. Never `import { icons }` (it bundles every icon).
- Decorative icons are hidden from screen readers automatically.

## Tables (lint)

- Every `<table>` has a `<caption>`; every `<th>` has `scope="col"` or `scope="row"`.
- Reveal row by row with `data-fragment` on `<tr>`. `data-focus` on a row marks the one the talk
  is about (the theme highlights it).

## Diagrams: inline SVG (lint)

```html
<svg role="img" viewBox="0 0 1600 560" class="dgm-flow">
  <title>Short description that names what the diagram shows</title>
  <desc>Longer text alternative: every label and relation in one or two sentences.</desc>
  <g data-fragment="1">
    <rect class="dgm-node" x="0" y="80" width="400" height="200" rx="16" />
    <text class="dgm-label dgm-label-strong" x="40" y="150">Input</text>
  </g>
</svg>
```

- `role="img"`, and the first child is a non-empty `<title>`.
- No paint attributes (`fill`, `stroke`, `font-*`, `opacity`, `style`, …): style through classes.
- Every class starts with `dgm-`. Reuse existing ones (`dgm-zone`, `dgm-zone-1..4`, `dgm-node`,
  `dgm-link`, `dgm-label`, `dgm-label-strong`); add new ones to `src/theme/diagrams.css`.
- No `url(#id)` references and no `href="#id"` inside SVG: previews strip ids, so markers,
  gradients and `<use>` would break. Draw arrowheads as path segments.
- Hand-draw diagrams. Never paste vendor figures or screenshots.
- Design on a viewBox about 1600-1730 wide; the canvas is 1920x1080 with margins.

## Theme classes the starter theme styles

`.columns > article` (cards; first `h3` becomes a sticker), `.lead`, `.question`, `.questions`,
`.tag`, `.ladder`, `.takeaways` (an `<ol>`), `.refs` (a `<ul>`, with `<cite>`), `.expansion`
(an acronym's full name under the term), `.acronyms`, title slide `.title-mark`, `.course`,
`.date`. Plain tables, figures and captions are styled too. When a slide needs something new,
add a semantic class in the slide and style it in `src/theme/`, never the other way round.

## The manifest: `src/deck.ts`

```ts
export const manifest: DeckManifest = {
  id: 'my-talk',            // namespaces storage and the sync channel; kebab-case
  title: 'My talk title',   // window titles and the presenter
  defaultProfile: 'full',
  profiles: {
    full: [{ id: 'title', targetSeconds: 20 }, /* … */ { id: 'extra', targetSeconds: 60, backup: true }],
    short: [/* a subset, in its own order */],
  },
};
```

- Profiles are versions of the talk, opened with `?profile=short`. The presenter follows the
  deck's profile, and its timer paces against the `targetSeconds` sums.
- `backup: true` keeps a slide after the end: reachable by jump, left out of the planned time.
- A slide can exist only for one profile (for example a merged slide for the short talk).

## Checking your work

| Command | What it proves |
|---|---|
| `pnpm dev` | Live reload with a lint overlay; open `/presenter.html` too |
| `pnpm check` | Typecheck, Biome, unit tests, slide lint for your deck and the example |
| `pnpm test:deck` | Your deck in a real browser: every slide fits the canvas, passes axe, prints one page per slide, runs offline |
| `pnpm test:engine` | The engine contract against the example deck (run after any engine change) |
| `pnpm pdf` | `out/deck-<profile>.pdf` |
| `pnpm notes:pdf [profile]` | `out/presenter-script.pdf`, one A4 page of script per slide |
| `pnpm notes:md` | `docs/presenter-script.md` |
