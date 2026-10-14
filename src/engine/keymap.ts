import type { Role } from './types.ts';

/**
 * The single source of truth for input: `resolveKey` drives the keyboard handler and
 * `BINDINGS` renders the help overlay. Letters match `event.code`, so they work on AZERTY
 * and Arabic layouts; `?`, `.` and digits match `event.key`.
 */

export type Action =
  | 'next'
  | 'prev'
  | 'first'
  | 'last'
  | 'enter'
  | 'backspace'
  | 'jump'
  | 'digit'
  | 'fullscreen'
  | 'overview'
  | 'blackout'
  | 'presenter'
  | 'help'
  | 'chrome'
  | 'escape';

export interface Binding {
  readonly action: Action;
  readonly keys?: readonly string[];
  readonly codes?: readonly string[];
  /** Labels shown in the help overlay. */
  readonly labels: readonly string[];
  readonly description: string;
  /** Windows where the binding applies (both when omitted). */
  readonly roles?: readonly Role[];
}

export const BINDINGS: readonly Binding[] = [
  {
    action: 'next',
    keys: ['ArrowRight', 'ArrowDown', 'PageDown', ' '],
    codes: ['Space'],
    labels: ['Right', 'Down', 'Space', 'PageDown', 'Enter', 'Click'],
    description: 'Next step, then next slide',
  },
  {
    action: 'prev',
    keys: ['ArrowLeft', 'ArrowUp', 'PageUp'],
    labels: ['Left', 'Up', 'PageUp', 'Backspace'],
    description: 'Previous step',
  },
  { action: 'enter', keys: ['Enter'], labels: [], description: '' },
  { action: 'backspace', keys: ['Backspace'], labels: [], description: '' },
  { action: 'first', keys: ['Home'], labels: ['Home'], description: 'First slide' },
  { action: 'last', keys: ['End'], labels: ['End'], description: 'Last slide' },
  {
    action: 'jump',
    codes: ['KeyG'],
    labels: ['G', 'digits', 'Enter'],
    description: 'Jump to slide N (type the number, then Enter)',
  },
  {
    action: 'fullscreen',
    codes: ['KeyF'],
    labels: ['F'],
    description: 'Toggle fullscreen (Esc also exits)',
  },
  {
    action: 'overview',
    codes: ['KeyO'],
    labels: ['O'],
    description: 'Overview grid (arrows move, Enter or click jumps)',
  },
  {
    action: 'blackout',
    codes: ['KeyB'],
    keys: ['.'],
    labels: ['B', '.'],
    description: 'Black out the audience screen',
  },
  {
    action: 'presenter',
    codes: ['KeyP'],
    labels: ['P'],
    description: 'Open the presenter window',
    roles: ['deck'],
  },
  { action: 'help', keys: ['?'], labels: ['?'], description: 'Show or hide this help' },
  {
    action: 'chrome',
    codes: ['KeyH'],
    labels: ['H'],
    description: 'Hide or show the progress bar and counter',
    roles: ['deck'],
  },
  {
    action: 'escape',
    keys: ['Escape'],
    labels: ['Esc'],
    description: 'Close an overlay (in fullscreen, the first Esc only exits fullscreen)',
  },
];

export interface KeyInput {
  readonly key: string;
  readonly code: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
  readonly isComposing?: boolean;
}

export interface ResolvedKey {
  readonly action: Action;
  /** The digit typed, for the `digit` action. */
  readonly digit?: number;
}

/** Maps a key event to an action, or null when the browser should keep it. */
export function resolveKey(input: KeyInput, role: Role): ResolvedKey | null {
  if (input.ctrlKey || input.metaKey || input.altKey || input.isComposing) return null;

  const applies = (binding: Binding): boolean => !binding.roles || binding.roles.includes(role);

  // `event.key` first, so layout-specific symbols (`?`, `.`) win over physical positions.
  for (const binding of BINDINGS) {
    if (applies(binding) && binding.keys?.includes(input.key)) return { action: binding.action };
  }
  if (/^[0-9]$/.test(input.key)) return { action: 'digit', digit: Number(input.key) };
  for (const binding of BINDINGS) {
    if (applies(binding) && binding.codes?.includes(input.code)) return { action: binding.action };
  }
  // AZERTY puts symbols on the unshifted digit row; accept the physical digit keys too.
  const digitCode = /^(?:Digit|Numpad)([0-9])$/.exec(input.code);
  if (digitCode) return { action: 'digit', digit: Number(digitCode[1]) };
  return null;
}

/** Help rows for one window: bindings that have a description. */
export function helpRows(role: Role): { labels: readonly string[]; description: string }[] {
  return BINDINGS.filter(
    (binding) => binding.description && (!binding.roles || binding.roles.includes(role)),
  ).map(({ labels, description }) => ({ labels, description }));
}
