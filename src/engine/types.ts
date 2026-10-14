/** Shared engine types. Positions are 0-based internally; the URL is 1-based. */

export interface Position {
  /** Index into the active profile's slide list. */
  readonly slide: number;
  /** Number of fragment steps revealed on that slide (0 = none). */
  readonly step: number;
}

/** Where a position change came from. Only `local` and `router` changes are broadcast. */
export type Origin = 'init' | 'local' | 'router' | 'remote';

export type Role = 'deck' | 'presenter';

export const SLIDE_TYPES = [
  'title',
  'statement',
  'two-column',
  'three-column',
  'comparison-table',
  'timeline',
  'diagram',
  'takeaway',
  'references',
] as const;

export type SlideType = (typeof SLIDE_TYPES)[number];

/** One slide partial, parsed. `html` is the section markup with the notes removed. */
export interface SlideModel {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly html: string;
  readonly notesHtml: string;
  readonly steps: number;
  readonly file: string;
}

/** A slide as it appears in a profile, with its rehearsal target. */
export interface ProfileEntry {
  readonly id: string;
  readonly targetSeconds: number;
  /** Backup slide after the end of the talk: reachable by jump, left out of the planned time. */
  readonly backup?: boolean;
}

export interface DeckManifest {
  readonly id: string;
  readonly title: string;
  readonly defaultProfile: string;
  readonly profiles: Readonly<Record<string, readonly ProfileEntry[]>>;
}

/** The deck resolved for one profile: slides in order, each with its target. */
export interface DeckModel {
  readonly id: string;
  readonly title: string;
  readonly profile: string;
  readonly slides: readonly (SlideModel & {
    readonly targetSeconds: number;
    readonly backup: boolean;
  })[];
}
