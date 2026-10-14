import type { DeckManifest } from '../../src/engine/types.ts';

/**
 * Deck manifest: slide order, profiles and per-slide target times (data only).
 * Full: 13 slides, 12:40. 10min: 10 slides, 8:50 (no "Sharing the air" or "Wi-Fi vs 5G";
 * Wi-Fi 6, 7 and 8 on one merged slide). Both end on References & questions.
 */
export const manifest: DeckManifest = {
  id: 'ceng645-wifi',
  title: 'Wireless Networks by Coverage and the Evolution of Wi-Fi',
  defaultProfile: 'full',
  profiles: {
    full: [
      { id: 'title', targetSeconds: 20 },
      { id: 'hook', targetSeconds: 45 },
      { id: 'coverage', targetSeconds: 75 },
      { id: 'rules', targetSeconds: 60 },
      { id: 'bands', targetSeconds: 75 },
      { id: 'sharing', targetSeconds: 60 },
      { id: 'generations', targetSeconds: 90 },
      { id: 'faster', targetSeconds: 60 },
      { id: 'wifi6', targetSeconds: 75 },
      { id: 'wifi7-8', targetSeconds: 75 },
      { id: 'wifi-vs-5g', targetSeconds: 45 },
      { id: 'table-updated', targetSeconds: 60 },
      { id: 'references', targetSeconds: 20 },
    ],
    '10min': [
      { id: 'title', targetSeconds: 20 },
      { id: 'hook', targetSeconds: 45 },
      { id: 'coverage', targetSeconds: 60 },
      { id: 'rules', targetSeconds: 45 },
      { id: 'bands', targetSeconds: 60 },
      { id: 'generations', targetSeconds: 80 },
      { id: 'faster', targetSeconds: 50 },
      { id: 'wifi6-7-8', targetSeconds: 90 },
      { id: 'table-updated', targetSeconds: 60 },
      { id: 'references', targetSeconds: 20 },
    ],
  },
};
