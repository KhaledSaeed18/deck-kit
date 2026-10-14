import { type PositionStore, samePosition } from './state.ts';
import type { Position } from './types.ts';

/**
 * Hash routing. The URL is `#/slide` or `#/slide/step`, 1-based and relative to the profile.
 * A slide change assigns `location.hash` (one history entry per slide, so Back walks slides);
 * a step change uses `replaceState` (no entry). `hashchange` is the only inbound signal.
 */

const HASH = /^#\/(\d+)(?:\/(\d+))?\/?$/;

/** Parses a hash into a 0-based position, unclamped. Returns null if it is not a deck hash. */
export function parseHash(hash: string): Position | null {
  const match = HASH.exec(hash);
  if (!match) return null;
  const slide = Number(match[1]) - 1;
  const step = match[2] === undefined ? 0 : Number(match[2]);
  return { slide: Math.max(0, slide), step };
}

export function formatHash(position: Position): string {
  const slide = `#/${position.slide + 1}`;
  return position.step > 0 ? `${slide}/${position.step}` : slide;
}

export interface RouterWindow {
  readonly location: Location;
  readonly history: History;
  addEventListener(type: 'hashchange', listener: () => void): void;
  removeEventListener(type: 'hashchange', listener: () => void): void;
}

function replace(win: RouterWindow, hash: string): void {
  try {
    win.history.replaceState(win.history.state, '', hash);
  } catch {
    // Safari limits history calls (100 per 10 s). The position is still correct in memory.
  }
}

/** Initial position from the current URL (unclamped), or slide 1. */
export function positionFromLocation(win: RouterWindow): Position {
  return parseHash(win.location.hash) ?? { slide: 0, step: 0 };
}

/** Keeps the URL and the store in step. Returns an unbind function. */
export function bindRouter(store: PositionStore, win: RouterWindow): () => void {
  if ('scrollRestoration' in win.history) win.history.scrollRestoration = 'manual';
  replace(win, formatHash(store.get()));

  const unsubscribe = store.subscribe((position, previous) => {
    const hash = formatHash(position);
    if (win.location.hash === hash) return;
    if (position.slide !== previous.slide) win.location.hash = hash;
    else replace(win, hash);
  });

  const onHashChange = (): void => {
    // Read the live hash, not the event's newURL: our own assignments echo back
    // asynchronously, and by then the store may have moved on.
    const parsed = parseHash(win.location.hash);
    if (parsed && !samePosition(parsed, store.get())) store.goto(parsed, 'router');
    const canonical = formatHash(store.get());
    if (win.location.hash !== canonical) replace(win, canonical);
  };
  win.addEventListener('hashchange', onHashChange);

  return () => {
    unsubscribe();
    win.removeEventListener('hashchange', onHashChange);
  };
}
