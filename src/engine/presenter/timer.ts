import { readItem, writeItem } from '../storage.ts';

/** Elapsed timer (start, pause, reset). Kept in sessionStorage so it survives a presenter refresh. */

export interface TimerState {
  readonly running: boolean;
  /** Epoch ms when the current run started (meaningful only while running). */
  readonly startedAt: number;
  /** Ms accumulated by earlier runs. */
  readonly accumulated: number;
}

export const STOPPED: TimerState = { running: false, startedAt: 0, accumulated: 0 };

export function elapsedMs(state: TimerState, now: number): number {
  return state.accumulated + (state.running ? Math.max(0, now - state.startedAt) : 0);
}

export function start(state: TimerState, now: number): TimerState {
  return state.running ? state : { running: true, startedAt: now, accumulated: state.accumulated };
}

export function pause(state: TimerState, now: number): TimerState {
  return state.running
    ? { running: false, startedAt: 0, accumulated: elapsedMs(state, now) }
    : state;
}

/** m:ss, or h:mm:ss past an hour. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function parse(raw: string | null): TimerState {
  if (!raw) return STOPPED;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return STOPPED;
    const { running, startedAt, accumulated } = value as Record<string, unknown>;
    if (typeof running !== 'boolean' || typeof startedAt !== 'number') return STOPPED;
    if (typeof accumulated !== 'number') return STOPPED;
    return { running, startedAt, accumulated };
  } catch {
    return STOPPED;
  }
}

export function createTimerStore(key: string): {
  get(): TimerState;
  set(state: TimerState): void;
} {
  let state = parse(readItem('sessionStorage', key));
  return {
    get: () => state,
    set(next) {
      state = next;
      writeItem('sessionStorage', key, JSON.stringify(next));
    },
  };
}
