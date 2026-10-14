import type { PositionStore } from './state.ts';
import { type Envelope, type Message, PROTOCOL_VERSION, type Transport } from './transport.ts';
import type { Role } from './types.ts';

/**
 * Deck/presenter sync over a Transport.
 * - Messages carry absolute positions, never "next".
 * - A window ignores its own messages and drops stale ones (seq per sender).
 * - Remote positions are applied with origin `remote`, which is never re-broadcast.
 * - The deck is authoritative: it announces its state on boot and answers `hello`.
 * - The presenter says `hello` on boot and then as a heartbeat. That is how it finds a reloaded
 *   deck over the opener fallback: the deck lost its popup reference, and a `bye` posted while
 *   the deck unloads arrives with a null source, so it cannot be trusted. Silence for three
 *   heartbeats marks the link as down.
 * - The deck confirms every remote position it applies, and answers every hello, tagged with
 *   `ack` (the seq of the presenter message it answers).
 *   If both windows move at once, both settle on the deck's final position. The presenter drops
 *   confirmations older than its own latest move, so rapid presses in it do not flicker.
 */

export interface SyncOptions {
  readonly role: Role;
  readonly ns: string;
  readonly store: PositionStore;
  readonly transport: Transport;
  /** Deck: apply a blackout request. Presenter: show the audience's blackout state. */
  readonly onBlackout: (on: boolean) => void;
  /** Deck only: current blackout, sent with the state. */
  readonly getBlackout?: () => boolean;
  /** Link status: true when the other window is heard, false on bye or a missed heartbeat. */
  readonly onLink?: (linked: boolean) => void;
  readonly senderId?: string;
  /** Presenter heartbeat interval (default 2000 ms). */
  readonly helloIntervalMs?: number;
  readonly now?: () => number;
}

export interface Sync {
  readonly sender: string;
  /** Deck: announce a blackout change. Presenter: ask the deck to change it. */
  sendBlackout(on: boolean): void;
  close(): void;
}

export function randomId(): string {
  const c = globalThis.crypto;
  // randomUUID needs a secure context; a LAN-IP static server is not one.
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function namespaceFor(deckId: string, profile: string): string {
  return `deck:v${PROTOCOL_VERSION}:${deckId}:${profile}`;
}

export function createSync(options: SyncOptions): Sync {
  const { role, ns, store, transport, onBlackout } = options;
  const sender = options.senderId ?? randomId();
  const lastSeq = new Map<string, number>();
  let seq = 0;
  /** Presenter: seq of the last state this window sent. */
  let lastStateSent = 0;
  let helloTimer: ReturnType<typeof setInterval> | undefined;
  const interval = options.helloIntervalMs ?? 2000;
  const now = options.now ?? Date.now;
  let linked = false;
  let lastHeard = 0;
  const setLinked = (value: boolean): void => {
    if (value !== linked) {
      linked = value;
      options.onLink?.(value);
    }
  };

  const send = (message: Message): void => {
    seq += 1;
    transport.send({ ...message, v: PROTOCOL_VERSION, ns, sender, seq } as Envelope);
  };

  const sendState = (ack?: number): void => {
    const { slide, step } = store.get();
    send({ type: 'state', payload: ack === undefined ? { slide, step } : { slide, step, ack } });
    lastStateSent = seq;
  };

  const stopHello = (): void => {
    if (helloTimer !== undefined) clearInterval(helloTimer);
    helloTimer = undefined;
  };

  const startHeartbeat = (): void => {
    stopHello();
    send({ type: 'hello' });
    helloTimer = setInterval(() => {
      if (linked && now() - lastHeard > 3 * interval) setLinked(false);
      send({ type: 'hello' });
    }, interval);
  };

  const unsubscribeStore = store.subscribe((_position, _previous, origin) => {
    if (origin === 'local' || origin === 'router') sendState();
  });

  const unsubscribeTransport = transport.subscribe((envelope) => {
    if (envelope.sender === sender) return;
    const previous = lastSeq.get(envelope.sender) ?? 0;
    if (envelope.seq <= previous) return;
    lastSeq.set(envelope.sender, envelope.seq);
    lastHeard = now();
    setLinked(envelope.type !== 'bye');

    switch (envelope.type) {
      case 'hello':
        if (role === 'deck') {
          sendState(envelope.seq);
          send({ type: 'blackout', payload: { on: options.getBlackout?.() ?? false } });
        }
        break;
      case 'state': {
        const { slide, step, ack } = envelope.payload;
        if (role === 'deck') {
          store.goto({ slide, step }, 'remote');
          sendState(envelope.seq);
          break;
        }
        // An answer to an older message of ours: our newer move is already on its way.
        if (ack !== undefined && ack < lastStateSent) break;
        store.goto({ slide, step }, 'remote');
        break;
      }
      case 'blackout':
        onBlackout(envelope.payload.on);
        break;
      case 'bye':
        // The heartbeat finds the deck again once it is back.
        break;
    }
  });

  const onPageHide = (): void => send({ type: 'bye' });
  if (typeof window !== 'undefined') window.addEventListener('pagehide', onPageHide);

  if (role === 'deck') {
    sendState();
    send({ type: 'blackout', payload: { on: options.getBlackout?.() ?? false } });
  } else {
    startHeartbeat();
  }

  return {
    sender,
    sendBlackout: (on) => send({ type: 'blackout', payload: { on } }),
    close() {
      stopHello();
      unsubscribeStore();
      unsubscribeTransport();
      if (typeof window !== 'undefined') window.removeEventListener('pagehide', onPageHide);
    },
  };
}
