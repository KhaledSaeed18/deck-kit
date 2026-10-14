import type { JumpState } from './jump.ts';
import { readItem, writeItem } from './storage.ts';

/** Deck chrome: progress bar, counter, jump chip, toast and blackout layer. */

const CHROME_KEY = 'deck:chrome-hidden';

export interface Chrome {
  readonly root: HTMLElement;
  readonly blackout: HTMLElement;
  /** Jump chip and toast: outside the hideable chrome, so they show even when it is hidden. */
  readonly overlays: readonly HTMLElement[];
  update(index: number, count: number, step: number, steps: number): void;
  setJump(state: JumpState): void;
  toast(text: string): void;
  toggleHidden(): void;
  setBlackout(on: boolean): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

export function createChrome(): Chrome {
  const root = el('div', 'deck-chrome');
  root.setAttribute('aria-hidden', 'true');

  const progress = el('div', 'deck-progress');
  const bar = el('div', 'deck-progress-bar');
  progress.append(bar);

  const counter = el('div', 'deck-counter');
  counter.dataset.counter = '';

  const jump = el('div', 'deck-jump');
  jump.hidden = true;
  jump.dataset.jump = '';

  const toastBox = el('div', 'deck-toast');
  toastBox.hidden = true;
  toastBox.setAttribute('role', 'status');

  root.append(progress, counter);

  const blackout = el('div', 'deck-blackout');
  blackout.hidden = true;
  blackout.dataset.blackout = '';

  const html = document.documentElement;
  const applyHidden = (hidden: boolean): void => {
    html.toggleAttribute('data-chrome-hidden', hidden);
  };
  applyHidden(readItem('localStorage', CHROME_KEY) === '1');

  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  return {
    root,
    blackout,
    overlays: [jump, toastBox],
    update(index, count, step, steps) {
      const fraction = count > 1 ? index / (count - 1) : 1;
      bar.style.setProperty('--progress', String(fraction));
      counter.textContent = `${index + 1} / ${count}`;
      counter.dataset.step = steps > 0 ? `${step}/${steps}` : '';
    },
    setJump(state) {
      jump.hidden = state.kind === 'idle';
      jump.toggleAttribute('data-invalid', state.kind === 'invalid');
      if (state.kind === 'typing') jump.textContent = `Go to slide ${state.digits || '_'}`;
      if (state.kind === 'invalid') jump.textContent = `No slide ${state.digits || '_'}`;
    },
    toast(text) {
      toastBox.textContent = text;
      toastBox.hidden = false;
      if (toastTimer !== undefined) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastBox.hidden = true;
      }, 4000);
    },
    toggleHidden() {
      const hidden = !html.hasAttribute('data-chrome-hidden');
      applyHidden(hidden);
      writeItem('localStorage', CHROME_KEY, hidden ? '1' : null);
    },
    setBlackout(on) {
      blackout.hidden = !on;
      html.toggleAttribute('data-blackout-on', on);
    },
  };
}
