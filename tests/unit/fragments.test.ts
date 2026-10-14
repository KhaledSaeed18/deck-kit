import { describe, expect, it } from 'vitest';
import { applyStep, countSteps, fragmentProblems, stateFor } from '../../src/engine/fragments.ts';
import { parseFragment } from '../../src/engine/loader.ts';

const html = `<section class="slide">
  <table><tbody>
    <tr data-fragment="1" id="a"></tr><tr data-fragment="2" id="b"></tr>
  </tbody></table>
  <svg><g data-fragment="2" id="c"></g><g data-fragment="3" id="d"></g></svg>
</section>`;

describe('fragments', () => {
  it('counts steps as the highest fragment number', () => {
    expect(countSteps(parseFragment(html))).toBe(3);
    expect(countSteps(parseFragment('<section class="slide"></section>'))).toBe(0);
  });

  it('maps step to hidden, visible and current', () => {
    expect(stateFor(1, 0)).toBe('hidden');
    expect(stateFor(1, 1)).toBe('current');
    expect(stateFor(1, 2)).toBe('visible');
  });

  it('applies states, sharing a step across table rows and SVG groups', () => {
    const root = parseFragment(html);
    applyStep(root, 2);
    const state = (id: string) => root.querySelector(`#${id}`)?.getAttribute('data-fragment-state');
    expect([state('a'), state('b'), state('c'), state('d')]).toEqual([
      'visible',
      'current',
      'current',
      'hidden',
    ]);
    expect(root.querySelector('#d')?.getAttribute('aria-hidden')).toBe('true');
    applyStep(root, 1);
    expect(state('b')).toBe('hidden');
    expect(root.querySelector('#a')?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('reports gaps and invalid numbers', () => {
    expect(
      fragmentProblems(parseFragment('<p data-fragment="1"></p><p data-fragment="3"></p>')),
    ).toEqual(['fragment step 2 is missing (steps must be contiguous from 1)']);
    expect(fragmentProblems(parseFragment('<p data-fragment="0"></p>'))).toContain(
      'data-fragment must be a positive integer',
    );
  });
});
