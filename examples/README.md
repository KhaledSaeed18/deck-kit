# Examples

Complete decks built on this kit. Each folder has the same shape as `src/` (a `deck.ts`
manifest, `content.ts`, `slides/`, `theme/`), so you can copy patterns from either one.

| Folder | Talk | Look | Run |
|---|---|---|---|
| `wifi/` | Wireless Networks by Coverage and the Evolution of Wi-Fi: 13 slides, 12:40, plus an 8:50 profile | Neo-brutalist: cream paper, ink borders, hard shadows | `pnpm dev:example` |
| `crypto/` | The Key Is the Only Secret, on Chapter 1 of *Understanding Cryptography*: 16 slides, 12:55, plus an 8:00 profile | A cryptanalyst's notebook: graph paper, red margin, red pencil, typewriter ciphertext | `pnpm dev:example:crypto` |

- `wifi/` is also the fixture the engine's browser tests run against (`pnpm test:engine`).
  Never edit it except to follow an engine change.
- `crypto/` was made from scratch with `/new-deck`, as a test of the whole workflow. Its
  `docs/` folder holds the brief, plan, decisions and fact log that workflow produced.
- Both are linted in `pnpm check`. Build any example with `vite build --mode example-<name>`
  (`--mode example` is the Wi-Fi deck); add `-single` for a one-file `deck.html`.
- To add an example, make `examples/<name>/` with the same four parts, then add it to
  `tests/unit/slides-lint.test.ts`, `tests/unit/literals.test.ts` and `build:example`.
