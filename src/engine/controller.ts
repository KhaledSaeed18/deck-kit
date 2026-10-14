import { toggleFullscreen } from './fullscreen.ts';
import type { Help } from './help.ts';
import type { JumpBuffer } from './jump.ts';
import type { ResolvedKey } from './keymap.ts';
import type { Overview } from './overview.ts';
import type { PositionStore } from './state.ts';

/**
 * Turns resolved keys into commands, with the modal rules from plan §4.2:
 * - jump buffer: digits accumulate, Enter commits, Backspace deletes; any other command cancels it
 * - overview open: arrows move the selection, Enter jumps, O or Esc closes
 * - blackout (deck only): navigation is ignored; B, `.` or a click resumes
 * - help: ? or Esc closes; navigating also closes it
 */

export interface ControllerOptions {
  readonly store: PositionStore;
  readonly overview: Overview;
  readonly help: Help;
  readonly jump: JumpBuffer;
  readonly isBlackout: () => boolean;
  readonly toggleBlackout: () => void;
  /** Deck: navigation is ignored while blacked out. Presenter: it is not. */
  readonly blackoutBlocksNavigation: boolean;
  readonly openPresenter?: () => void;
  readonly toggleChrome?: () => void;
}

const NAVIGATION = new Set([
  'next',
  'prev',
  'first',
  'last',
  'enter',
  'backspace',
  'digit',
  'jump',
]);

export function createController(options: ControllerOptions): {
  handleKey(key: ResolvedKey, event: { readonly key: string }): boolean;
  next(): void;
  prev(): void;
} {
  const { store, overview, help, jump } = options;

  const navigationBlocked = (): boolean => options.blackoutBlocksNavigation && options.isBlackout();

  const next = (): void => {
    jump.cancel();
    if (navigationBlocked() || overview.isOpen) return;
    help.close();
    store.next();
  };
  const prev = (): void => {
    jump.cancel();
    if (navigationBlocked() || overview.isOpen) return;
    help.close();
    store.prev();
  };

  function handleKey(resolved: ResolvedKey, event: { readonly key: string }): boolean {
    const { action } = resolved;

    // Jump buffer first: digits, Enter and Backspace belong to it while it is active.
    if (action === 'digit' && resolved.digit !== undefined && !overview.isOpen) {
      if (navigationBlocked()) return true;
      jump.digit(resolved.digit);
      return true;
    }
    if (action === 'enter' && jump.active) {
      const target = jump.commit();
      if (typeof target === 'number') {
        help.close();
        store.goto({ slide: target, step: 0 });
      }
      return true;
    }
    if (action === 'backspace' && jump.backspace()) return true;
    if (action !== 'digit') jump.cancel();

    if (overview.isOpen) {
      if (action === 'overview' || action === 'escape') {
        overview.close();
        return true;
      }
      if (overview.handleKey(event.key)) return true;
      if (action === 'next') return overview.handleKey('ArrowRight');
      if (action === 'prev' || action === 'backspace') return overview.handleKey('ArrowLeft');
      if (action === 'first') return overview.handleKey('Home');
      if (action === 'last') return overview.handleKey('End');
      if (NAVIGATION.has(action)) return true;
    }

    if (navigationBlocked()) {
      if (action === 'blackout' || action === 'escape') {
        options.toggleBlackout();
        return true;
      }
      if (action === 'fullscreen') {
        void toggleFullscreen();
        return true;
      }
      if (action === 'presenter') {
        options.openPresenter?.();
        return true;
      }
      // Swallow everything else so the clicker cannot move the hidden deck.
      return true;
    }

    switch (action) {
      case 'next':
      case 'enter':
        next();
        return true;
      case 'prev':
      case 'backspace':
        prev();
        return true;
      case 'first':
        help.close();
        store.first();
        return true;
      case 'last':
        help.close();
        store.last();
        return true;
      case 'jump':
        jump.open();
        return true;
      case 'fullscreen':
        void toggleFullscreen();
        return true;
      case 'overview':
        help.close();
        overview.open(store.get().slide);
        return true;
      case 'blackout':
        options.toggleBlackout();
        return true;
      case 'presenter':
        options.openPresenter?.();
        return options.openPresenter !== undefined;
      case 'help':
        help.toggle();
        return true;
      case 'chrome':
        options.toggleChrome?.();
        return options.toggleChrome !== undefined;
      case 'escape':
        if (help.isOpen) {
          help.close();
          return true;
        }
        return false;
      case 'digit':
        return false;
    }
  }

  return { handleKey, next, prev };
}
