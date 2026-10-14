import { createLiveRegion } from '../a11y.ts';
import { createChrome } from '../chrome.ts';
import { createController } from '../controller.ts';
import { bindFullscreenState } from '../fullscreen.ts';
import { createHelp } from '../help.ts';
import { iconElement } from '../icons.ts';
import { createJumpBuffer } from '../jump.ts';
import { bindKeyboard } from '../keyboard.ts';
import { createOverview } from '../overview.ts';
import { bindPointer } from '../pointer.ts';
import { createPreview } from '../preview.ts';
import { bindRouter, positionFromLocation } from '../router.ts';
import { createStore, type PositionStore } from '../state.ts';
import { createSync, namespaceFor } from '../sync.ts';
import {
  broadcastTransport,
  combineTransports,
  type Transport,
  windowTransport,
} from '../transport.ts';
import type { DeckModel } from '../types.ts';
import { createTimerStore, elapsedMs, formatDuration, pause, STOPPED, start } from './timer.ts';

/**
 * Presenter window: current slide at its live step, next slide at step 0, notes, timer,
 * wall clock, counter, profile and per-slide target. Its keys drive the deck.
 */

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function iconButton(className: string, icon: string, label: string): HTMLButtonElement {
  const button = el('button', className);
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  const svg = iconElement(icon);
  if (svg) button.append(svg);
  return button;
}

export type Pace = 'idle' | 'ahead' | 'on' | 'behind';

/**
 * Compares elapsed time with the planned window for the current slide: ahead if the slide
 * started early, behind if its planned end has already passed.
 */
export function paceFor(
  elapsedSec: number,
  plannedStartSec: number,
  plannedEndSec: number,
  started: boolean,
): { pace: Pace; label: string } {
  if (!started) return { pace: 'idle', label: 'Start the timer to see pace' };
  if (elapsedSec < plannedStartSec) {
    return {
      pace: 'ahead',
      label: `${formatDuration((plannedStartSec - elapsedSec) * 1000)} ahead`,
    };
  }
  if (elapsedSec > plannedEndSec) {
    return {
      pace: 'behind',
      label: `${formatDuration((elapsedSec - plannedEndSec) * 1000)} behind`,
    };
  }
  return { pace: 'on', label: 'On pace' };
}

export function stepsLeftLabel(stepsLeft: number, isLast: boolean): string {
  if (stepsLeft > 0) return `${stepsLeft} ${stepsLeft === 1 ? 'step' : 'steps'} left on this slide`;
  return isLast ? 'End of deck' : 'Next slide';
}

export function mountPresenter(app: HTMLElement, deck: DeckModel): { store: PositionStore } {
  const html = document.documentElement;
  html.dataset.role = 'presenter';
  document.title = `Presenter | ${deck.title}`;

  const store = createStore(
    deck.slides.map((s) => s.steps),
    positionFromLocation(window),
  );

  // Header bar.
  const bar = el('header', 'presenter-bar');
  const counter = el('div', 'presenter-counter');
  counter.dataset.counter = '';
  const profile = el('div', 'presenter-profile', `Profile ${deck.profile}`);
  const target = el('div', 'presenter-target');
  const timerBox = el('div', 'presenter-timer');
  const elapsed = el('span', 'presenter-elapsed', '0:00');
  elapsed.dataset.elapsed = '';
  const toggle = iconButton('presenter-timer-toggle', 'play', 'Start timer');
  const reset = iconButton('presenter-timer-reset', 'rotate-ccw', 'Reset timer');
  timerBox.append(elapsed, toggle, reset);
  const clock = el('time', 'presenter-clock');
  const status = el('div', 'presenter-status');
  const pace = el('div', 'presenter-pace');
  pace.dataset.pace = 'idle';
  status.dataset.status = '';
  bar.append(counter, target, pace, timerBox, clock, profile, status);

  // Previews and notes.
  const currentPane = el('section', 'presenter-current');
  currentPane.setAttribute('aria-label', 'Current slide');
  const current = createPreview('presenter-preview-current');
  currentPane.append(current.element);

  const nextPane = el('section', 'presenter-next');
  nextPane.setAttribute('aria-label', 'Next slide');
  const nextLabel = el('p', 'presenter-next-label');
  nextLabel.dataset.nextLabel = '';
  const next = createPreview('presenter-preview-next');
  nextPane.append(nextLabel, next.element);

  const notesPane = el('section', 'presenter-notes');
  notesPane.setAttribute('aria-label', 'Speaker notes');
  // Scrollable, so it must be focusable for keyboard and screen-reader users (axe).
  notesPane.tabIndex = 0;
  const notesTitle = el('h2', 'presenter-notes-title');
  const notes = el('div', 'presenter-notes-body');
  notes.dataset.notes = '';
  notesPane.append(notesTitle, notes);

  const chrome = createChrome();
  const help = createHelp('presenter');
  const live = createLiveRegion();
  const overview = createOverview(deck.slides, (index) => store.goto({ slide: index, step: 0 }));
  const jump = createJumpBuffer({ count: () => store.count, onChange: chrome.setJump });

  const root = el('div', 'presenter');
  root.append(
    bar,
    currentPane,
    nextPane,
    notesPane,
    ...chrome.overlays,
    overview.element,
    help.element,
    live.element,
  );
  app.replaceChildren(root);

  // Status.
  let linked = false;
  let audienceBlackout = false;
  const renderStatus = (): void => {
    status.textContent = `${linked ? 'Linked to deck' : 'Waiting for the deck window'}${
      audienceBlackout ? ', audience blacked out' : ''
    }`;
    status.toggleAttribute('data-linked', linked);
    html.toggleAttribute('data-audience-blackout', audienceBlackout);
  };

  // Slide-dependent panes.
  const plannedUntil = (index: number): number =>
    deck.slides.slice(0, index + 1).reduce((sum, s) => sum + (s.backup ? 0 : s.targetSeconds), 0);
  const plannedTotal = plannedUntil(deck.slides.length - 1);
  const render = (): void => {
    const { slide, step } = store.get();
    const model = deck.slides[slide];
    if (!model) return;
    const steps = store.stepsOf(slide);
    const isLast = slide === store.count - 1;
    counter.textContent = `Slide ${slide + 1} / ${store.count}${steps > 0 ? `, step ${step} / ${steps}` : ''}`;
    target.textContent = model.backup
      ? `Backup slide, outside the planned ${formatDuration(plannedTotal * 1000)}`
      : `Target ${formatDuration(model.targetSeconds * 1000)}, planned by end of slide ${formatDuration(plannedUntil(slide) * 1000)}`;
    current.show(model, step);
    next.show(deck.slides[slide + 1] ?? null, 0);
    nextLabel.textContent = stepsLeftLabel(steps - step, isLast);
    notesTitle.textContent = model.title;
    if (notes.dataset.slide !== model.id) {
      notes.innerHTML = model.notesHtml || '<p>No notes for this slide.</p>';
      // Lines meant for the other talk (data-profile="10min" vs "full") are not shown.
      for (const part of notes.querySelectorAll<HTMLElement>('[data-profile]')) {
        if (part.dataset.profile !== deck.profile) part.remove();
      }
      notes.dataset.slide = model.id;
      notesPane.scrollTop = 0;
    }
    // Highlight the script paragraph for the current build step and bring it into view.
    let active: HTMLElement | null = null;
    for (const part of notes.querySelectorAll<HTMLElement>('[data-step]')) {
      const isActive = Number(part.dataset.step) === step;
      part.toggleAttribute('data-active', isActive);
      if (isActive) active = part;
    }
    if (active && step > 0) {
      const offset = active.getBoundingClientRect().top - notesPane.getBoundingClientRect().top;
      notesPane.scrollTop += offset - notesPane.clientHeight / 4;
    } else if (active) {
      notesPane.scrollTop = 0;
    }
    live.announce(`Slide ${slide + 1} of ${store.count}`);
  };
  render();
  store.subscribe(render);
  bindRouter(store, window);

  // Sync with the deck window.
  const ns = namespaceFor(deck.id, deck.profile);
  const transports: Transport[] = [windowTransport(ns)];
  const channel = broadcastTransport(ns);
  if (channel) transports.unshift(channel);
  const sync = createSync({
    role: 'presenter',
    ns,
    store,
    transport: combineTransports(transports),
    onBlackout: (on) => {
      audienceBlackout = on;
      renderStatus();
    },
    onLink: (value) => {
      linked = value;
      renderStatus();
    },
  });
  renderStatus();

  // Timer and clock.
  const timer = createTimerStore(`deck:timer:${deck.id}:${deck.profile}`);
  const tick = (): void => {
    const state = timer.get();
    elapsed.textContent = formatDuration(elapsedMs(state, Date.now()));
    const label = state.running ? 'Pause timer' : 'Start timer';
    if (toggle.getAttribute('aria-label') !== label) {
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
      toggle.replaceChildren(
        ...[iconElement(state.running ? 'pause' : 'play')].filter((n) => n !== null),
      );
    }
    toggle.toggleAttribute('data-running', state.running);
    const index = store.get().slide;
    const model = deck.slides[index];
    const elapsedSec = elapsedMs(state, Date.now()) / 1000;
    const started = state.running || state.accumulated > 0;
    const result = model?.backup
      ? { pace: 'idle' as const, label: 'Backup slide' }
      : paceFor(elapsedSec, plannedUntil(index - 1), plannedUntil(index), started);
    if (pace.textContent !== result.label) pace.textContent = result.label;
    pace.dataset.pace = result.pace;
    const now = new Date();
    clock.dateTime = now.toISOString();
    clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  toggle.addEventListener('click', () => {
    const state = timer.get();
    timer.set(state.running ? pause(state, Date.now()) : start(state, Date.now()));
    tick();
    toggle.blur();
  });
  reset.addEventListener('click', () => {
    timer.set(STOPPED);
    tick();
    reset.blur();
  });
  tick();
  setInterval(tick, 250);

  const controller = createController({
    store,
    overview,
    help,
    jump,
    isBlackout: () => audienceBlackout,
    toggleBlackout: () => sync.sendBlackout(!audienceBlackout),
    blackoutBlocksNavigation: false,
  });
  bindKeyboard('presenter', controller.handleKey);
  bindPointer(root, {
    clickAdvances: false,
    onNext: controller.next,
    onPrev: controller.prev,
    onClick: (clicked) => {
      if (overview.isOpen) return !clicked.closest('.overview-thumb');
      if (help.isOpen) {
        help.close();
        return true;
      }
      return false;
    },
  });
  bindFullscreenState();

  return { store };
}
