import type { DeckManifest } from './engine/types.ts';

/**
 * Deck manifest: slide order, profiles and per-slide target times (data only).
 * Each profile is one version of the talk (open it with ?profile=<name>); the presenter
 * timer paces against `targetSeconds`. Mark a slide `backup: true` to keep it after the end,
 * reachable by jump but left out of the planned time.
 * Full: 8 slides, 3:30. Short: 6 slides, 2:20.
 */
export const manifest: DeckManifest = {
  id: 'starter-deck',
  title: 'Your talk title goes here',
  defaultProfile: 'full',
  profiles: {
    full: [
      { id: 'title', targetSeconds: 20 },
      { id: 'idea', targetSeconds: 25 },
      { id: 'layers', targetSeconds: 35 },
      { id: 'keys', targetSeconds: 35 },
      { id: 'presenter', targetSeconds: 30 },
      { id: 'delivery', targetSeconds: 25 },
      { id: 'takeaways', targetSeconds: 20 },
      { id: 'references', targetSeconds: 20 },
    ],
    short: [
      { id: 'title', targetSeconds: 15 },
      { id: 'idea', targetSeconds: 20 },
      { id: 'keys', targetSeconds: 30 },
      { id: 'presenter', targetSeconds: 30 },
      { id: 'takeaways', targetSeconds: 25 },
      { id: 'references', targetSeconds: 20 },
    ],
  },
};
