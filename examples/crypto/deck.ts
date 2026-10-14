import type { DeckManifest } from '../../src/engine/types.ts';

/**
 * Deck manifest: slide order, profiles and per-slide target times (data only).
 * Full: 16 slides, 12:55. Short: 12 slides, 8:00 (no field map, Moore's law, reduce-early or
 * affine slides).
 */
export const manifest: DeckManifest = {
  id: 'crypto-ch1',
  title: 'The Key Is the Only Secret',
  defaultProfile: 'full',
  profiles: {
    full: [
      { id: 'title', targetSeconds: 20 },
      { id: 'hook', targetSeconds: 40 },
      { id: 'field', targetSeconds: 50 },
      { id: 'channel', targetSeconds: 60 },
      { id: 'kerckhoffs', targetSeconds: 45 },
      { id: 'substitution', targetSeconds: 50 },
      { id: 'frequency', targetSeconds: 80 },
      { id: 'attacks', targetSeconds: 50 },
      { id: 'key-bits', targetSeconds: 50 },
      { id: 'moore', targetSeconds: 45 },
      { id: 'clock', targetSeconds: 60 },
      { id: 'reduce', targetSeconds: 45 },
      { id: 'caesar', targetSeconds: 60 },
      { id: 'affine', targetSeconds: 60 },
      { id: 'lessons', targetSeconds: 40 },
      { id: 'references', targetSeconds: 20 },
    ],
    short: [
      { id: 'title', targetSeconds: 15 },
      { id: 'hook', targetSeconds: 35 },
      { id: 'channel', targetSeconds: 50 },
      { id: 'kerckhoffs', targetSeconds: 40 },
      { id: 'substitution', targetSeconds: 40 },
      { id: 'frequency', targetSeconds: 70 },
      { id: 'attacks', targetSeconds: 40 },
      { id: 'key-bits', targetSeconds: 40 },
      { id: 'clock', targetSeconds: 50 },
      { id: 'caesar', targetSeconds: 50 },
      { id: 'lessons', targetSeconds: 35 },
      { id: 'references', targetSeconds: 15 },
    ],
  },
};
