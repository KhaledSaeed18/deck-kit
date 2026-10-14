import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../src/engine/state.ts';
import { createSync } from '../../src/engine/sync.ts';
import { type Envelope, parseEnvelope, type Transport } from '../../src/engine/transport.ts';

/** An in-memory bus: every transport receives every message, including its own (like a shared channel). */
function bus() {
  const members = new Set<(e: Envelope) => void>();
  const log: Envelope[] = [];
  const transport = (): Transport => {
    let mine: ((e: Envelope) => void) | undefined;
    return {
      name: 'memory',
      send: (e) => {
        log.push(e);
        // Deliver asynchronously, twice, to mimic two transports carrying the same message.
        queueMicrotask(() => {
          for (const m of members) {
            m(e);
            m(e);
          }
        });
      },
      subscribe: (l) => {
        mine = l;
        members.add(l);
        return () => members.delete(l);
      },
      close: () => {
        if (mine) members.delete(mine);
      },
    };
  };
  return { transport, log };
}

const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

describe('sync', () => {
  const ns = 'deck:v1:test:full';

  it('keeps both windows in step both ways, without echo', async () => {
    const { transport, log } = bus();
    const deckStore = createStore([0, 2, 0], { slide: 1, step: 1 });
    const deck = createSync({
      role: 'deck',
      ns,
      store: deckStore,
      transport: transport(),
      onBlackout: vi.fn(),
    });
    const presenterStore = createStore([0, 2, 0]);
    const presenter = createSync({
      role: 'presenter',
      ns,
      store: presenterStore,
      transport: transport(),
      onBlackout: vi.fn(),
      helloIntervalMs: 60_000,
    });
    await flush();
    expect(presenterStore.get()).toEqual({ slide: 1, step: 1 });

    presenterStore.next();
    await flush();
    expect(deckStore.get()).toEqual({ slide: 1, step: 2 });

    deckStore.next();
    await flush();
    expect(presenterStore.get()).toEqual({ slide: 2, step: 0 });

    // No echo loop: one state per local move, plus the handshake and the deck's confirmation.
    const states = log.filter((e) => e.type === 'state');
    expect(states.map((e) => e.payload)).toEqual([
      { slide: 1, step: 1 }, // deck boot
      { slide: 1, step: 1, ack: 1 }, // deck answers the presenter's first hello
      { slide: 1, step: 2 }, // presenter next
      { slide: 1, step: 2, ack: states[2]?.seq }, // deck confirms it
      { slide: 2, step: 0 }, // deck next
    ]);
    deck.close();
    presenter.close();
  });

  function pair(deckAt = { slide: 4, step: 0 }) {
    const { transport } = bus();
    const steps = Array(10).fill(0);
    const deckStore = createStore(steps, deckAt);
    const presenterStore = createStore(steps);
    const deck = createSync({
      role: 'deck',
      ns,
      store: deckStore,
      transport: transport(),
      onBlackout: vi.fn(),
    });
    const presenter = createSync({
      role: 'presenter',
      ns,
      store: presenterStore,
      transport: transport(),
      onBlackout: vi.fn(),
      helloIntervalMs: 60_000,
    });
    return {
      deckStore,
      presenterStore,
      close: () => {
        deck.close();
        presenter.close();
      },
    };
  }

  it('settles on one position when both windows move in the same tick', async () => {
    const { deckStore, presenterStore, close } = pair({ slide: 5, step: 0 });
    await flush();
    deckStore.next(); // clicker on the deck: 6
    presenterStore.prev(); // keyboard in the presenter: 4
    await flush();
    expect(presenterStore.get()).toEqual(deckStore.get());
    close();
  });

  it('a hello reply does not undo a newer presenter move', async () => {
    const { deckStore, presenterStore, close } = pair({ slide: 4, step: 0 });
    presenterStore.goto({ slide: 5, step: 0 }); // pressed before the deck answered
    await flush();
    expect(deckStore.get()).toEqual({ slide: 5, step: 0 });
    expect(presenterStore.get()).toEqual({ slide: 5, step: 0 });
    close();
  });

  it('rapid presenter presses never bounce back to an older confirmation', async () => {
    const { deckStore, presenterStore, close } = pair({ slide: 0, step: 0 });
    await flush();
    const seen: number[] = [];
    presenterStore.subscribe((p, _q, origin) => {
      if (origin === 'remote') seen.push(p.slide);
    });
    presenterStore.next();
    presenterStore.next();
    presenterStore.next();
    await flush();
    expect(deckStore.get().slide).toBe(3);
    expect(presenterStore.get().slide).toBe(3);
    expect(seen).toEqual([]);
    close();
  });

  describe('heartbeat', () => {
    afterEach(() => vi.useRealTimers());

    it('marks the link down after three silent heartbeats and finds a reloaded deck again', async () => {
      vi.useFakeTimers();
      let clock = 0;
      const { transport } = bus();
      const links: boolean[] = [];
      const presenterStore = createStore([0, 0, 0]);
      const presenter = createSync({
        role: 'presenter',
        ns,
        store: presenterStore,
        transport: transport(),
        onBlackout: vi.fn(),
        onLink: (l) => links.push(l),
        helloIntervalMs: 1000,
        now: () => clock,
      });
      const deck1 = createSync({
        role: 'deck',
        ns,
        store: createStore([0, 0, 0], { slide: 1, step: 0 }),
        transport: transport(),
        onBlackout: vi.fn(),
      });
      await flush();
      expect(links).toEqual([true]);
      expect(presenterStore.get().slide).toBe(1);

      deck1.close(); // the deck goes away without a usable bye
      for (let t = 0; t < 5; t++) {
        clock += 1000;
        vi.advanceTimersByTime(1000);
        await flush();
      }
      expect(links).toEqual([true, false]);

      // A reloaded deck that cannot reach the presenter at boot still answers the next heartbeat.
      const deckStore2 = createStore([0, 0, 0], { slide: 2, step: 0 });
      const deck2 = createSync({
        role: 'deck',
        ns,
        store: deckStore2,
        transport: transport(),
        onBlackout: vi.fn(),
      });
      await flush();
      clock += 1000;
      vi.advanceTimersByTime(1000);
      await flush();
      expect(links).toEqual([true, false, true]);
      expect(presenterStore.get().slide).toBe(2);
      deck2.close();
      presenter.close();
    });
  });

  it('routes blackout from the presenter to the deck and reports it back', async () => {
    const { transport } = bus();
    let blackout = false;
    const presenterSeen: boolean[] = [];
    let deck: ReturnType<typeof createSync> | undefined;
    deck = createSync({
      role: 'deck',
      ns,
      store: createStore([0]),
      transport: transport(),
      getBlackout: () => blackout,
      onBlackout: (on) => {
        blackout = on;
        deck?.sendBlackout(on);
      },
    });
    const presenter = createSync({
      role: 'presenter',
      ns,
      store: createStore([0]),
      transport: transport(),
      onBlackout: (on) => presenterSeen.push(on),
      helloIntervalMs: 60_000,
    });
    await flush();
    presenter.sendBlackout(true);
    await flush();
    expect(blackout).toBe(true);
    expect(presenterSeen.at(-1)).toBe(true);
    deck.close();
    presenter.close();
  });

  it('rejects malformed or foreign messages', () => {
    const good = { v: 1, ns, sender: 'a', seq: 1, type: 'state', payload: { slide: 1, step: 0 } };
    expect(parseEnvelope(good, ns)).not.toBeNull();
    expect(parseEnvelope({ ...good, ns: 'other' }, ns)).toBeNull();
    expect(parseEnvelope({ ...good, v: 2 }, ns)).toBeNull();
    expect(parseEnvelope({ ...good, payload: { slide: -1, step: 0 } }, ns)).toBeNull();
    expect(parseEnvelope({ ...good, type: 'next' }, ns)).toBeNull();
    expect(parseEnvelope({ ...good, payload: { slide: 1, step: 0, ack: 'x' } }, ns)).toBeNull();
    expect(parseEnvelope({ ...good, payload: { slide: 1, step: 0, ack: 3 } }, ns)?.type).toBe(
      'state',
    );
    expect(parseEnvelope('hello', ns)).toBeNull();
  });
});
