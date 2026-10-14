import { type Action, type ResolvedKey, resolveKey } from './keymap.ts';
import type { Role } from './types.ts';

/** Keydown dispatch with the guards from plan §4.2. */

const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const ACTIVATABLE = 'button, a[href], summary, [role="button"]';
const TOGGLES: ReadonlySet<Action> = new Set([
  'fullscreen',
  'overview',
  'blackout',
  'presenter',
  'help',
  'chrome',
  'jump',
]);

function eventTarget(event: KeyboardEvent): Element | null {
  const [first] = event.composedPath();
  return first instanceof Element ? first : null;
}

export function isEditableTarget(target: Element | null): boolean {
  if (!target) return false;
  if (target instanceof HTMLElement && target.isContentEditable) return true;
  return target.closest(EDITABLE) !== null;
}

/** Returns the action for an event after the guards, or null to leave it to the browser. */
export function actionFor(event: KeyboardEvent, role: Role): ResolvedKey | null {
  if (event.defaultPrevented) return null;
  const target = eventTarget(event);
  if (isEditableTarget(target)) return null;
  const resolved = resolveKey(event, role);
  if (!resolved) return null;
  // Let a focused button or link handle its own activation keys.
  if ((event.key === 'Enter' || event.key === ' ') && target?.closest(ACTIVATABLE)) return null;
  if (event.repeat && TOGGLES.has(resolved.action)) return null;
  return resolved;
}

/** Calls `handle` for each recognised key; prevents the default only when it returns true. */
export function bindKeyboard(
  role: Role,
  handle: (key: ResolvedKey, event: KeyboardEvent) => boolean,
  doc: Document = document,
): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    const resolved = actionFor(event, role);
    if (resolved && handle(resolved, event)) event.preventDefault();
  };
  doc.addEventListener('keydown', onKeyDown);
  return () => doc.removeEventListener('keydown', onKeyDown);
}
