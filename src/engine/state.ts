import type { Origin, Position } from './types.ts';

export type Listener = (position: Position, previous: Position, origin: Origin) => void;

export interface PositionStore {
  get(): Position;
  /** Clamped absolute move. No-op (no notification) when the position does not change. */
  goto(target: Position, origin?: Origin): void;
  next(origin?: Origin): void;
  prev(origin?: Origin): void;
  first(origin?: Origin): void;
  last(origin?: Origin): void;
  /** Steps on a slide (0 if the index is out of range). */
  stepsOf(slide: number): number;
  readonly count: number;
  subscribe(listener: Listener): () => void;
}

export function samePosition(a: Position, b: Position): boolean {
  return a.slide === b.slide && a.step === b.step;
}

/** Clamps a position into the deck: slide into [0, count-1], step into [0, steps]. */
export function clampPosition(target: Position, stepsPerSlide: readonly number[]): Position {
  const count = stepsPerSlide.length;
  if (count === 0) return { slide: 0, step: 0 };
  const slide = clampInt(target.slide, 0, count - 1);
  const step = clampInt(target.step, 0, stepsPerSlide[slide] ?? 0);
  return { slide, step };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

export function createStore(stepsPerSlide: readonly number[], initial?: Position): PositionStore {
  const steps = [...stepsPerSlide];
  const listeners = new Set<Listener>();
  let current = clampPosition(initial ?? { slide: 0, step: 0 }, steps);

  const stepsOf = (slide: number): number => steps[slide] ?? 0;

  function goto(target: Position, origin: Origin = 'local'): void {
    const next = clampPosition(target, steps);
    if (samePosition(next, current)) return;
    const previous = current;
    current = next;
    for (const listener of listeners) listener(current, previous, origin);
  }

  return {
    count: steps.length,
    get: () => current,
    goto,
    stepsOf,
    next(origin = 'local') {
      const { slide, step } = current;
      if (step < stepsOf(slide)) goto({ slide, step: step + 1 }, origin);
      else if (slide < steps.length - 1) goto({ slide: slide + 1, step: 0 }, origin);
    },
    prev(origin = 'local') {
      const { slide, step } = current;
      if (step > 0) goto({ slide, step: step - 1 }, origin);
      else if (slide > 0) goto({ slide: slide - 1, step: stepsOf(slide - 1) }, origin);
    },
    first(origin = 'local') {
      goto({ slide: 0, step: 0 }, origin);
    },
    last(origin = 'local') {
      goto({ slide: steps.length - 1, step: 0 }, origin);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
