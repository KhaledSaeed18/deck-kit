import { describe, expect, it } from 'vitest';
import { resolveKey } from '../../src/engine/keymap.ts';
import { toCanvasPoint } from '../../src/engine/laser.ts';
import { parseEnvelope } from '../../src/engine/transport.ts';

const ns = 'deck:v1:test:full';
const base = { v: 1, ns, sender: 'a', seq: 1 };

describe('laser pointer', () => {
  it('maps client points into canvas units, and nothing outside the box', () => {
    const rect = new DOMRect(100, 50, 960, 540);
    expect(toCanvasPoint(rect, 100, 50)).toEqual({ x: 0, y: 0 });
    expect(toCanvasPoint(rect, 580, 320)).toEqual({ x: 960, y: 540 });
    expect(toCanvasPoint(rect, 1060, 590)).toEqual({ x: 1920, y: 1080 });
    expect(toCanvasPoint(rect, 99, 300)).toBeNull();
    expect(toCanvasPoint(new DOMRect(0, 0, 0, 0), 0, 0)).toBeNull();
  });

  it('parses laser messages with and without a point', () => {
    expect(
      parseEnvelope({ ...base, type: 'laser', payload: { on: true, x: 10, y: 20 } }, ns),
    ).toEqual({ ...base, type: 'laser', payload: { on: true, x: 10, y: 20 } });
    expect(parseEnvelope({ ...base, type: 'laser', payload: { on: false } }, ns)).toEqual({
      ...base,
      type: 'laser',
      payload: { on: false },
    });
    expect(parseEnvelope({ ...base, type: 'laser', payload: { on: 'yes' } }, ns)).toBeNull();
  });

  it('binds L in both windows', () => {
    expect(resolveKey({ key: 'l', code: 'KeyL' }, 'deck')).toEqual({ action: 'laser' });
    expect(resolveKey({ key: 'l', code: 'KeyL' }, 'presenter')).toEqual({ action: 'laser' });
  });
});
