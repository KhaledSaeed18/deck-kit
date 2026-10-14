import { describe, expect, it } from 'vitest';
import {
  elapsedMs,
  formatDuration,
  pause,
  STOPPED,
  start,
} from '../../src/engine/presenter/timer.ts';
import { paceFor, stepsLeftLabel } from '../../src/engine/presenter/view.ts';

describe('presenter timer', () => {
  it('starts, pauses and accumulates', () => {
    let s = start(STOPPED, 1000);
    expect(elapsedMs(s, 4000)).toBe(3000);
    s = pause(s, 4000);
    expect(elapsedMs(s, 99_000)).toBe(3000);
    s = start(s, 10_000);
    expect(elapsedMs(s, 12_000)).toBe(5000);
  });

  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });

  it('labels the next-slide preview', () => {
    expect(stepsLeftLabel(2, false)).toBe('2 steps left on this slide');
    expect(stepsLeftLabel(1, true)).toBe('1 step left on this slide');
    expect(stepsLeftLabel(0, true)).toBe('End of deck');
    expect(stepsLeftLabel(0, false)).toBe('Next slide');
  });

  it('reports pace against the planned window of the slide', () => {
    expect(paceFor(0, 65, 155, false)).toEqual({
      pace: 'idle',
      label: 'Start the timer to see pace',
    });
    expect(paceFor(40, 65, 155, true)).toEqual({ pace: 'ahead', label: '0:25 ahead' });
    expect(paceFor(100, 65, 155, true)).toEqual({ pace: 'on', label: 'On pace' });
    expect(paceFor(200, 65, 155, true)).toEqual({ pace: 'behind', label: '0:45 behind' });
  });
});
