/**
 * The digit-jump buffer behind the jump chip. Digits accumulate, Enter commits, Backspace
 * deletes a digit, and the buffer clears after a few seconds. An invalid number flashes and
 * clears without navigating. G opens an empty chip; it never focuses a real input.
 */

export type JumpState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'typing'; readonly digits: string }
  | { readonly kind: 'invalid'; readonly digits: string };

export interface JumpBuffer {
  readonly active: boolean;
  open(): void;
  digit(d: number): void;
  /** Deletes a digit. Returns false when the buffer was not active (so Backspace means prev). */
  backspace(): boolean;
  /** Returns the 0-based slide to jump to, null if invalid, or undefined if not active. */
  commit(): number | null | undefined;
  cancel(): void;
}

export interface JumpOptions {
  readonly count: () => number;
  readonly onChange: (state: JumpState) => void;
  readonly timeoutMs?: number;
  readonly flashMs?: number;
}

const MAX_DIGITS = 3;

export function createJumpBuffer(options: JumpOptions): JumpBuffer {
  let active = false;
  let digits = '';
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clearTimer = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const reset = (): void => {
    clearTimer();
    active = false;
    digits = '';
    options.onChange({ kind: 'idle' });
  };
  const arm = (ms: number): void => {
    clearTimer();
    timer = setTimeout(reset, ms);
  };
  const typing = (): void => {
    options.onChange({ kind: 'typing', digits });
    arm(options.timeoutMs ?? 3000);
  };

  return {
    get active() {
      return active;
    },
    open() {
      active = true;
      digits = '';
      typing();
    },
    digit(d) {
      active = true;
      if (digits.length < MAX_DIGITS) digits += String(d);
      typing();
    },
    backspace() {
      if (!active) return false;
      if (digits === '') reset();
      else {
        digits = digits.slice(0, -1);
        typing();
      }
      return true;
    },
    commit() {
      if (!active) return undefined;
      const n = Number(digits);
      if (digits !== '' && Number.isInteger(n) && n >= 1 && n <= options.count()) {
        reset();
        return n - 1;
      }
      const shown = digits;
      active = false;
      digits = '';
      options.onChange({ kind: 'invalid', digits: shown });
      arm(options.flashMs ?? 900);
      return null;
    },
    cancel() {
      if (active || timer !== undefined) reset();
    },
  };
}
