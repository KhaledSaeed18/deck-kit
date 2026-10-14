import { describe, expect, it } from 'vitest';
import { bindRouter, formatHash, parseHash } from '../../src/engine/router.ts';
import { createStore } from '../../src/engine/state.ts';

describe('hash format', () => {
  it('parses 1-based slide and optional step', () => {
    expect(parseHash('#/5')).toEqual({ slide: 4, step: 0 });
    expect(parseHash('#/5/2')).toEqual({ slide: 4, step: 2 });
    expect(parseHash('#/5/')).toEqual({ slide: 4, step: 0 });
    expect(parseHash('#/0')).toEqual({ slide: 0, step: 0 });
  });

  it('rejects non-deck hashes', () => {
    for (const hash of ['', '#', '#5', '#/a', '#/1/x', '#/-1', '#top']) {
      expect(parseHash(hash)).toBeNull();
    }
  });

  it('never writes step 0', () => {
    expect(formatHash({ slide: 0, step: 0 })).toBe('#/1');
    expect(formatHash({ slide: 4, step: 2 })).toBe('#/5/2');
  });
});

describe('bindRouter', () => {
  function fakeWindow(initial: string) {
    const listeners = new Set<() => void>();
    const entries: string[] = [initial];
    const win = {
      location: {
        get hash() {
          return entries.at(-1) ?? '';
        },
        set hash(value: string) {
          entries.push(value);
          queueMicrotask(() => {
            for (const l of listeners) l();
          });
        },
      } as Location,
      history: {
        state: null,
        scrollRestoration: 'auto',
        replaceState(_s: unknown, _t: string, url: string) {
          entries[entries.length - 1] = url;
        },
      } as unknown as History,
      addEventListener: (_t: 'hashchange', l: () => void) => listeners.add(l),
      removeEventListener: (_t: 'hashchange', l: () => void) => listeners.delete(l),
      entries,
      userNavigates(hash: string) {
        entries.push(hash);
        for (const l of listeners) l();
      },
    };
    return win;
  }

  it('pushes one entry per slide and replaces for steps', async () => {
    const win = fakeWindow('#/1');
    const store = createStore([0, 2, 0]);
    bindRouter(store, win);
    store.next(); // slide 2
    store.next(); // step 1
    store.next(); // step 2
    await Promise.resolve();
    expect(win.entries).toEqual(['#/1', '#/2/2']);
  });

  it('ignores the echo of its own hash writes, even after moving on', async () => {
    const win = fakeWindow('#/1');
    const store = createStore([0, 0, 0]);
    bindRouter(store, win);
    store.next();
    store.next();
    await Promise.resolve();
    await Promise.resolve();
    expect(store.get()).toEqual({ slide: 2, step: 0 });
  });

  it('follows inbound hash changes and normalises out-of-range ones', () => {
    const win = fakeWindow('#/1');
    const store = createStore([0, 2]);
    bindRouter(store, win);
    win.userNavigates('#/2/9');
    expect(store.get()).toEqual({ slide: 1, step: 2 });
    expect(win.location.hash).toBe('#/2/2');
  });
});
