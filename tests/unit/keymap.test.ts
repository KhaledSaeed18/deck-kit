import { describe, expect, it } from 'vitest';
import { actionFor } from '../../src/engine/keyboard.ts';
import { BINDINGS, helpRows, resolveKey } from '../../src/engine/keymap.ts';

const key = (k: string, code = '', extra: object = {}) => ({ key: k, code, ...extra });

describe('resolveKey', () => {
  it('maps clicker and arrow keys', () => {
    for (const k of ['ArrowRight', 'ArrowDown', 'PageDown', ' ']) {
      expect(resolveKey(key(k), 'deck')?.action).toBe('next');
    }
    for (const k of ['ArrowLeft', 'ArrowUp', 'PageUp']) {
      expect(resolveKey(key(k), 'deck')?.action).toBe('prev');
    }
    expect(resolveKey(key('Enter'), 'deck')?.action).toBe('enter');
    expect(resolveKey(key('Backspace'), 'deck')?.action).toBe('backspace');
    expect(resolveKey(key('Home'), 'deck')?.action).toBe('first');
    expect(resolveKey(key('End'), 'deck')?.action).toBe('last');
  });

  it('matches letters by physical code, whatever the layout prints', () => {
    // AZERTY: the key at KeyQ prints "a"; Arabic: KeyO prints "خ".
    expect(resolveKey(key('خ', 'KeyO'), 'deck')?.action).toBe('overview');
    expect(resolveKey(key('ب', 'KeyF'), 'deck')?.action).toBe('fullscreen');
    expect(resolveKey(key('a', 'KeyQ'), 'deck')).toBeNull();
    expect(resolveKey(key('b', 'KeyB'), 'deck')?.action).toBe('blackout');
    expect(resolveKey(key('g', 'KeyG'), 'deck')?.action).toBe('jump');
  });

  it('matches ?, . and digits by key, including the numpad and the AZERTY digit row', () => {
    expect(resolveKey(key('?', 'Comma'), 'deck')?.action).toBe('help');
    expect(resolveKey(key('.', 'Semicolon'), 'deck')?.action).toBe('blackout');
    expect(resolveKey(key('7', 'Numpad7'), 'deck')).toEqual({ action: 'digit', digit: 7 });
    expect(resolveKey(key('&', 'Digit1'), 'deck')).toEqual({ action: 'digit', digit: 1 });
  });

  it('passes modifier combinations and IME composition to the browser', () => {
    expect(resolveKey(key('p', 'KeyP', { metaKey: true }), 'deck')).toBeNull();
    expect(resolveKey(key('r', 'KeyR', { ctrlKey: true }), 'deck')).toBeNull();
    expect(resolveKey(key('ArrowLeft', '', { altKey: true }), 'deck')).toBeNull();
    expect(resolveKey(key('ArrowRight', '', { isComposing: true }), 'deck')).toBeNull();
  });

  it('limits deck-only keys to the deck window', () => {
    expect(resolveKey(key('p', 'KeyP'), 'presenter')).toBeNull();
    expect(resolveKey(key('h', 'KeyH'), 'presenter')).toBeNull();
    expect(resolveKey(key('h', 'KeyH'), 'deck')?.action).toBe('chrome');
  });

  it('feeds the help overlay from the same table', () => {
    const deckRows = helpRows('deck').map((r) => r.description);
    expect(deckRows.length).toBe(BINDINGS.filter((b) => b.description).length);
    expect(helpRows('presenter').some((r) => r.labels.includes('P'))).toBe(false);
  });
});

describe('keyboard guards', () => {
  const fire = (target: Element, init: KeyboardEventInit) => {
    let result: ReturnType<typeof actionFor> = null;
    target.addEventListener('keydown', (e) => {
      result = actionFor(e as KeyboardEvent, 'deck');
    });
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, ...init }));
    return result;
  };

  it('ignores keys typed into editable elements', () => {
    document.body.innerHTML =
      '<input id="i"><div id="c" contenteditable="true"><span id="s"></span></div><p id="p"></p>';
    for (const id of ['i', 's']) {
      const el = document.getElementById(id);
      if (el) expect(fire(el, { key: 'ArrowRight' })).toBeNull();
    }
    const p = document.getElementById('p');
    if (p) expect(fire(p, { key: 'ArrowRight' })).toEqual({ action: 'next' });
  });

  it('lets a focused button handle Enter and Space, and ignores toggle auto-repeat', () => {
    document.body.innerHTML = '<button id="b"></button><p id="p"></p>';
    const b = document.getElementById('b');
    const p = document.getElementById('p');
    if (!b || !p) throw new Error('fixture');
    expect(fire(b, { key: 'Enter' })).toBeNull();
    expect(fire(b, { key: 'PageDown' })).toEqual({ action: 'next' });
    expect(fire(p, { key: 'o', code: 'KeyO', repeat: true })).toBeNull();
    expect(fire(p, { key: 'PageDown', repeat: true })).toEqual({ action: 'next' });
  });
});
