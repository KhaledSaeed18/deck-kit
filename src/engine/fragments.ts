/** Fragment steps: `data-fragment="N"` is hidden until step N of its slide. */

export type FragmentState = 'hidden' | 'visible' | 'current';

const SELECTOR = '[data-fragment]';

/** Fragment numbers used inside `root`, in document order. NaN for invalid values. */
export function fragmentNumbers(root: ParentNode): number[] {
  return Array.from(root.querySelectorAll(SELECTOR), (el) => {
    const raw = el.getAttribute('data-fragment') ?? '';
    return /^[1-9]\d*$/.test(raw) ? Number(raw) : Number.NaN;
  });
}

/** Number of steps on a slide: the highest valid fragment number, or 0. */
export function countSteps(root: ParentNode): number {
  let max = 0;
  for (const n of fragmentNumbers(root)) {
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

/** Problems with the numbering: invalid values or gaps in 1..max. */
export function fragmentProblems(root: ParentNode): string[] {
  const numbers = fragmentNumbers(root);
  const problems: string[] = [];
  if (numbers.some((n) => !Number.isFinite(n))) {
    problems.push('data-fragment must be a positive integer');
  }
  const used = new Set(numbers.filter(Number.isFinite));
  const max = countSteps(root);
  for (let n = 1; n <= max; n++) {
    if (!used.has(n))
      problems.push(`fragment step ${n} is missing (steps must be contiguous from 1)`);
  }
  return problems;
}

export function stateFor(fragment: number, step: number): FragmentState {
  if (fragment < step) return 'visible';
  if (fragment === step) return 'current';
  return 'hidden';
}

/** Applies `data-fragment-state` to every fragment under `root` for the given step. */
export function applyStep(root: ParentNode, step: number): void {
  for (const el of root.querySelectorAll(SELECTOR)) {
    const n = Number(el.getAttribute('data-fragment'));
    const state = stateFor(n, step);
    if (el.getAttribute('data-fragment-state') !== state) {
      el.setAttribute('data-fragment-state', state);
    }
    if (state === 'hidden') el.setAttribute('aria-hidden', 'true');
    else el.removeAttribute('aria-hidden');
  }
}
