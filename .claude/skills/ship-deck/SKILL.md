---
name: ship-deck
description: Final verification and packaging for this deck kit: runs every check, builds the single-file deck, the PDFs and the presenter script, and lists what to take to the room with the fallback order. Use when the talk is ready, before presenting, or when the user asks to export, build, package, or "get it ready for the USB stick".
---

# Ship the deck

1. Run, in order, and stop at the first failure (show its output, fix it if it is clearly
   mechanical, otherwise report):
   - `pnpm check`
   - `pnpm test:e2e` (engine suite on the example, plus your deck in a real browser, all with
     the network blocked)
   - `pnpm build:single`, which writes `dist-single/deck.html`
   - `pnpm pdf`, which writes `out/deck-<profile>.pdf` for every profile
   - `pnpm notes:pdf` (and `pnpm notes:pdf <profile>` for each other profile the speaker
     might give), which writes `out/presenter-script-<profile>.pdf`
2. Check that nothing is pending: no `data-todo` (the lint fails on them), every flag in
   `docs/plan.md` has an answer in `docs/decisions.md`, and the profile times fit the slot.
3. Collect the files to take to the room into `out/usb/`:
   - `deck.html` (from `dist-single/`)
   - `deck-<profile>.pdf` for each profile
   - the presenter script PDF(s)
   - a copy of `dist/` as `dist/` (for the static-server option)
4. Tell the speaker the fallback order, and the keys that matter on the day:
   1. `pnpm preview` (or `python3 -m http.server -d dist`), open the deck, press P for the
      presenter window, and move it to the laptop screen
   2. `deck.html` from the USB stick by double-click; P opens the presenter
      (`deck.html?role=presenter`)
   3. the PDF
   Keys: F fullscreen, P presenter, B blackout, O overview, a number then Enter to jump, H to
   hide the progress bar. Clickers send PageUp/PageDown, which work. Add `?profile=<name>`
   for a shorter version.
5. Suggest one full rehearsal with the presenter timer running; the pace line shows whether
   they are ahead or behind each slide's plan.

Commit or tag only if the speaker asks.
