/**
 * Message transports between the deck and presenter windows. BroadcastChannel is primary;
 * a window.opener / postMessage transport covers contexts where the channel does not link
 * the two windows (Firefox treats each file:// file as its own origin). Both may run at once,
 * so the sync layer de-duplicates by sender and sequence number.
 */

export const PROTOCOL_VERSION = 1;

export type Message =
  | { readonly type: 'hello' }
  | { readonly type: 'bye' }
  | {
      readonly type: 'state';
      /** `ack`: set by the deck when confirming a presenter move (that message's seq). */
      readonly payload: { readonly slide: number; readonly step: number; readonly ack?: number };
    }
  | { readonly type: 'blackout'; readonly payload: { readonly on: boolean } };

export type Envelope = Message & {
  readonly v: typeof PROTOCOL_VERSION;
  readonly ns: string;
  readonly sender: string;
  readonly seq: number;
};

export interface Transport {
  readonly name: string;
  send(envelope: Envelope): void;
  subscribe(listener: (envelope: Envelope) => void): () => void;
  close(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** Validates an incoming message for the given namespace. */
export function parseEnvelope(data: unknown, ns: string): Envelope | null {
  if (!isRecord(data) || data.v !== PROTOCOL_VERSION || data.ns !== ns) return null;
  if (typeof data.sender !== 'string' || !isInt(data.seq)) return null;
  const base = { v: PROTOCOL_VERSION, ns, sender: data.sender, seq: data.seq } as const;
  switch (data.type) {
    case 'hello':
    case 'bye':
      return { ...base, type: data.type };
    case 'state': {
      const p = data.payload;
      if (!isRecord(p) || !isInt(p.slide) || !isInt(p.step)) return null;
      if (p.ack !== undefined && !isInt(p.ack)) return null;
      const payload = isInt(p.ack)
        ? { slide: p.slide, step: p.step, ack: p.ack }
        : { slide: p.slide, step: p.step };
      return { ...base, type: 'state', payload };
    }
    case 'blackout': {
      const p = data.payload;
      if (!isRecord(p) || typeof p.on !== 'boolean') return null;
      return { ...base, type: 'blackout', payload: { on: p.on } };
    }
    default:
      return null;
  }
}

class Listeners {
  private readonly set = new Set<(envelope: Envelope) => void>();
  add(listener: (envelope: Envelope) => void): () => void {
    this.set.add(listener);
    return () => this.set.delete(listener);
  }
  emit(envelope: Envelope): void {
    for (const listener of this.set) listener(envelope);
  }
}

/** BroadcastChannel transport, or null when the channel cannot be created. */
export function broadcastTransport(ns: string): Transport | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel(ns);
  } catch {
    return null;
  }
  const listeners = new Listeners();
  channel.addEventListener('message', (event: MessageEvent<unknown>) => {
    const envelope = parseEnvelope(event.data, ns);
    if (envelope) listeners.emit(envelope);
  });
  return {
    name: 'broadcast',
    send: (envelope) => channel.postMessage(envelope),
    subscribe: (listener) => listeners.add(listener),
    close: () => channel.close(),
  };
}

export interface WindowTransport extends Transport {
  /** Registers a window this one opened (the presenter popup). */
  addPeer(peer: Window): void;
}

/**
 * postMessage transport between a window and its opener. Accepts messages only from the
 * opener, or from a window this one opened (checked through `source.opener`, which stays
 * readable across origins and survives a reload of this window).
 */
export function windowTransport(ns: string, self: Window = window): WindowTransport {
  const listeners = new Listeners();
  const peers = new Set<Window>();
  if (self.opener && self.opener !== self) peers.add(self.opener as Window);

  const isPeer = (source: MessageEventSource | null): source is Window => {
    if (!source || !('postMessage' in source) || source === self) return false;
    const win = source as Window;
    try {
      return win === self.opener || win.opener === self;
    } catch {
      return false;
    }
  };

  const onMessage = (event: MessageEvent<unknown>): void => {
    if (!isPeer(event.source)) return;
    const envelope = parseEnvelope(event.data, ns);
    if (!envelope) return;
    peers.add(event.source);
    listeners.emit(envelope);
  };
  self.addEventListener('message', onMessage);

  return {
    name: 'window',
    addPeer: (peer) => peers.add(peer),
    send(envelope) {
      for (const peer of peers) {
        try {
          if (peer.closed) peers.delete(peer);
          // The origin is "null" on file://, so the target cannot be narrowed.
          else peer.postMessage(envelope, '*');
        } catch {
          peers.delete(peer);
        }
      }
    },
    subscribe: (listener) => listeners.add(listener),
    close: () => self.removeEventListener('message', onMessage),
  };
}

/** Fans out over several transports. */
export function combineTransports(transports: readonly Transport[]): Transport {
  return {
    name: transports.map((t) => t.name).join('+'),
    send: (envelope) => {
      for (const t of transports) t.send(envelope);
    },
    subscribe: (listener) => {
      const offs = transports.map((t) => t.subscribe(listener));
      return () => {
        for (const off of offs) off();
      };
    },
    close: () => {
      for (const t of transports) t.close();
    },
  };
}
