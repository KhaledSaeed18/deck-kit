---
name: add-slide
description: Add, rewrite, split or merge a slide in this deck kit, with notes, build steps, manifest entry and checks. Use when the user asks for a new slide, a profile-specific slide, a diagram slide, or a rework of one existing slide.
---

# Add or rewrite a slide

1. Read `docs/authoring.md`, and `docs/brief.md` plus `docs/decisions.md` if they exist. Look at
   the neighbouring slides in `src/slides/` so the new one matches their voice and notes depth.
   `examples/wifi/slides/` has a worked example of every slide type.
2. Settle the content. Facts and numbers must come from the brief, the decisions or
   `docs/fact-log.md`. If the slide needs a new claim, research it (with a source), add it to
   the fact log, and mark the on-screen text `data-todo="new claim, needs approval"` until the
   speaker approves it.
3. Write `src/slides/NN-<id>.html`:
   - pick the `data-type` that matches the content's shape (comparison: `comparison-table`;
     sequence: `timeline`; relation: `diagram`; two or three parallel points: `two-column` or
     `three-column`; one idea: `statement`; closing points: `takeaway`)
   - about 30 words on screen; detail goes in the notes
   - build steps with `data-fragment` where revealing in order helps the story
   - notes: Script with one `data-step` block per step (0 to the last), Next, Acronyms,
     If asked, `<details>` with sources
   - number the file to sit in talk order (renaming neighbours is fine; ids do not change)
4. Add it to every profile that should show it in `src/deck.ts`, with a target time, and
   rebalance times so each profile still fits its length. Fix the Next line of the slide before
   it (and its `data-profile` variants).
5. New icons go in `src/assets/icons.ts`; new `dgm-*` classes or layout classes get styles in
   `src/theme/` using existing tokens only.
6. Check: `pnpm check`, `pnpm test:deck`, then `pnpm shots` and look at the new slide's images
   in `out/shots/` (fully built and step 1). Fix and repeat until clean.
7. Report what changed, the new profile times, any `data-todo` left, and the check output.
