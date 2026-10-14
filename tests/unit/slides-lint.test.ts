import { describe, expect, it } from 'vitest';
import { partials as cryptoPartials } from '../../examples/crypto/content.ts';
import { manifest as cryptoManifest } from '../../examples/crypto/deck.ts';
import { partials as wifiPartials } from '../../examples/wifi/content.ts';
import { manifest as wifiManifest } from '../../examples/wifi/deck.ts';
import { ICON_NAMES } from '../../src/assets/icons.ts';
import { partials } from '../../src/content.ts';
import { manifest } from '../../src/deck.ts';
import { loadSlides, resolveDeck } from '../../src/engine/loader.ts';
import type { DeckManifest } from '../../src/engine/types.ts';
import { formatIssues, lintDeck } from '../../src/engine/validate.ts';

/** `pnpm check:slides`: every partial passes the slide lint, with no open todos. The example
 * decks are linted too, so an engine change that breaks it shows up here. */
const decks: readonly [string, DeckManifest, Record<string, string>][] = [
  ['src/slides', manifest, partials],
  ['examples/wifi/slides', wifiManifest, wifiPartials],
  ['examples/crypto/slides', cryptoManifest, cryptoPartials],
];

describe.each(decks)('slide lint: %s', (_, deckManifest, deckPartials) => {
  const sources = Object.entries(deckPartials).map(([path, source]) => ({
    file: path.slice(path.lastIndexOf('/') + 1),
    source,
  }));

  it('finds the partials', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it('has no lint errors', () => {
    const errors = lintDeck(sources, ICON_NAMES).filter((i) => i.severity === 'error');
    expect(errors, `\n${formatIssues(errors)}`).toEqual([]);
  });

  // Fails by design while content awaits the user's approval (data-todo), so nothing ships unresolved.
  it('has no data-todo awaiting approval', () => {
    const todos = lintDeck(sources, ICON_NAMES).filter((i) => i.severity === 'todo');
    expect(todos, `\n${formatIssues(todos)}`).toEqual([]);
  });

  it('every profile resolves to existing slides', () => {
    const slides = loadSlides(deckPartials);
    for (const profile of Object.keys(deckManifest.profiles)) {
      expect(() => resolveDeck(deckManifest, slides, profile)).not.toThrow();
    }
  });
});
