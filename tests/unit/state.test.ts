import { describe, expect, it, vi } from 'vitest';
import { clampPosition, createStore } from '../../src/engine/state.ts';

describe('position store', () => {
  const steps = [0, 3, 1];

  it('reveals steps, then moves to the next slide at step 0', () => {
    const store = createStore(steps);
    store.next();
    expect(store.get()).toEqual({ slide: 1, step: 0 });
    store.next();
    store.next();
    store.next();
    expect(store.get()).toEqual({ slide: 1, step: 3 });
    store.next();
    expect(store.get()).toEqual({ slide: 2, step: 0 });
  });

  it('goes back step by step, and lands on the previous slide fully built', () => {
    const store = createStore(steps, { slide: 2, step: 0 });
    store.prev();
    expect(store.get()).toEqual({ slide: 1, step: 3 });
    store.prev();
    expect(store.get()).toEqual({ slide: 1, step: 2 });
  });

  it('stops at both ends without notifying', () => {
    const store = createStore(steps, { slide: 2, step: 1 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.next();
    expect(listener).not.toHaveBeenCalled();
    store.first();
    store.prev();
    expect(store.get()).toEqual({ slide: 0, step: 0 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('first, last and goto land on step 0 or clamp', () => {
    const store = createStore(steps);
    store.last();
    expect(store.get()).toEqual({ slide: 2, step: 0 });
    store.goto({ slide: 1, step: 99 });
    expect(store.get()).toEqual({ slide: 1, step: 3 });
  });

  it('passes the origin to listeners', () => {
    const store = createStore(steps);
    const origins: string[] = [];
    store.subscribe((_p, _q, origin) => origins.push(origin));
    store.next('remote');
    store.next();
    expect(origins).toEqual(['remote', 'local']);
  });

  it('clamps out-of-range and non-finite values', () => {
    expect(clampPosition({ slide: -4, step: -1 }, steps)).toEqual({ slide: 0, step: 0 });
    expect(clampPosition({ slide: 99, step: 99 }, steps)).toEqual({ slide: 2, step: 1 });
    expect(clampPosition({ slide: Number.NaN, step: 2 }, steps)).toEqual({ slide: 0, step: 0 });
    expect(clampPosition({ slide: 1.7, step: 2.9 }, steps)).toEqual({ slide: 1, step: 2 });
  });
});

describe('stage offsets', () => {
  it('centres the canvas on whole pixels', async () => {
    const { fitScale, stageOffset } = await import('../../src/engine/stage.ts');
    expect(stageOffset(1680, 945, fitScale(1680, 945))).toEqual({ x: 0, y: 0 });
    expect(stageOffset(1000, 1000, fitScale(1000, 1000))).toEqual({ x: 0, y: 219 });
    expect(stageOffset(1366, 768, fitScale(1366, 768))).toEqual({ x: 0, y: 0 });
    const odd = stageOffset(1281, 1000, fitScale(1281, 1000));
    expect(Number.isInteger(odd.x) && Number.isInteger(odd.y)).toBe(true);
  });
});
