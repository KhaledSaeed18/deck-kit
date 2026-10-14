import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJumpBuffer, type JumpState } from '../../src/engine/jump.ts';

describe('jump buffer', () => {
  let states: JumpState[];
  const make = () => createJumpBuffer({ count: () => 12, onChange: (s) => states.push(s) });
  beforeEach(() => {
    states = [];
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('accumulates digits and commits a 0-based slide', () => {
    const jump = make();
    jump.digit(1);
    jump.digit(2);
    expect(states.at(-1)).toEqual({ kind: 'typing', digits: '12' });
    expect(jump.commit()).toBe(11);
    expect(jump.active).toBe(false);
  });

  it('flashes and clears on an invalid number', () => {
    const jump = make();
    jump.digit(4);
    jump.digit(0);
    expect(jump.commit()).toBeNull();
    expect(states.at(-1)).toEqual({ kind: 'invalid', digits: '40' });
    vi.advanceTimersByTime(1000);
    expect(states.at(-1)).toEqual({ kind: 'idle' });
  });

  it('Backspace deletes digits only while active', () => {
    const jump = make();
    expect(jump.backspace()).toBe(false);
    jump.digit(3);
    expect(jump.backspace()).toBe(true);
    expect(states.at(-1)).toEqual({ kind: 'typing', digits: '' });
  });

  it('times out after about 3 seconds, and G opens an empty chip', () => {
    const jump = make();
    jump.open();
    expect(states.at(-1)).toEqual({ kind: 'typing', digits: '' });
    vi.advanceTimersByTime(3100);
    expect(jump.active).toBe(false);
    expect(jump.commit()).toBeUndefined();
  });
});
