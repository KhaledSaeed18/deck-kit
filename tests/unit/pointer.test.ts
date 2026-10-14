import { describe, expect, it, vi } from 'vitest';
import { bindPointer, classifySwipe } from '../../src/engine/pointer.ts';

describe('swipe classification', () => {
  it('needs 50 px, mostly horizontal, under 600 ms', () => {
    expect(classifySwipe(-80, 10, 200)).toBe('next');
    expect(classifySwipe(80, 10, 200)).toBe('prev');
    expect(classifySwipe(-40, 0, 200)).toBeNull();
    expect(classifySwipe(-80, 60, 200)).toBeNull();
    expect(classifySwipe(-80, 0, 900)).toBeNull();
  });
});

describe('bindPointer', () => {
  const pointer = (type: string, x: number, init: PointerEventInit = {}) =>
    new PointerEvent(type, {
      bubbles: true,
      clientX: x,
      clientY: 0,
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      ...init,
    });

  it('a tap after a swipe still advances (no stale swipe flag)', () => {
    document.body.innerHTML = '<div id="s"><p id="t">x</p></div>';
    const surface = document.getElementById('s') as HTMLElement;
    const target = document.getElementById('t') as HTMLElement;
    const onNext = vi.fn();
    const onPrev = vi.fn();
    bindPointer(surface, { clickAdvances: true, onNext, onPrev });
    target.dispatchEvent(pointer('pointerdown', 300));
    target.dispatchEvent(pointer('pointerup', 200));
    expect(onNext).toHaveBeenCalledTimes(1); // swipe left; the browser sends no click after it
    target.dispatchEvent(pointer('pointerdown', 100));
    target.dispatchEvent(pointer('pointerup', 100));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }));
    expect(onNext).toHaveBeenCalledTimes(2);
  });

  it('clicks on links and [data-no-advance] do not advance; the presenter never click-advances', () => {
    document.body.innerHTML =
      '<div id="s"><a id="a" href="#">l</a><p id="n" data-no-advance>n</p><p id="p">p</p></div>';
    const surface = document.getElementById('s') as HTMLElement;
    const onNext = vi.fn();
    bindPointer(surface, { clickAdvances: true, onNext, onPrev: vi.fn() });
    for (const id of ['a', 'n'])
      document.getElementById(id)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onNext).not.toHaveBeenCalled();
    document.getElementById('p')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onNext).toHaveBeenCalledTimes(1);

    document.body.innerHTML = '<div id="s2"><p id="q">q</p></div>';
    const presenterNext = vi.fn();
    bindPointer(document.getElementById('s2') as HTMLElement, {
      clickAdvances: false,
      onNext: presenterNext,
      onPrev: vi.fn(),
    });
    document.getElementById('q')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(presenterNext).not.toHaveBeenCalled();
  });
});
