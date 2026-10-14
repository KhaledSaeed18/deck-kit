import { describe, expect, it } from 'vitest';
import { countWords, lintDeck, lintSlide } from '../../src/engine/validate.ts';

const icons = ['wifi', 'arrow-right'];
const script = (steps: number) =>
  `<aside class="notes">${Array.from({ length: steps + 1 }, (_, n) => `<p data-step="${n}">say ${n}</p>`).join('')}</aside>`;
const slide = (body: string, attrs = '', steps = -1) => {
  // Script every fragment step the body declares, unless the test passes its own notes.
  const n =
    steps >= 0
      ? steps
      : Math.max(0, ...[...body.matchAll(/data-fragment="(\d+)"/g)].map((m) => Number(m[1])));
  const notes = body.includes('class="notes"') ? '' : script(n);
  return `<section class="slide" data-type="statement" data-id="s" aria-labelledby="s-h" ${attrs}><h2 id="s-h">Title</h2>${body}${notes}</section>`;
};
const rules = (source: string) => lintSlide('x.html', source, icons).map((i) => i.rule);

describe('slide lint rules', () => {
  it('accepts a clean slide', () => {
    expect(
      lintSlide(
        'x.html',
        slide(
          '<p>Fine <i data-icon="wifi"></i></p><aside class="notes"><p data-step="0">Note with ~ and — is fine.</p></aside>',
        ),
        icons,
      ),
    ).toEqual([]);
  });

  it('requires one root section, a valid id and type', () => {
    expect(rules('<div></div>')).toEqual(['root']);
    expect(rules(slide('').replace('data-id="s"', 'data-id="Bad_Id"'))).toContain('id');
    expect(rules(slide('').replace('statement', 'fancy'))).toContain('type');
  });

  it('requires exactly one heading linked by aria-labelledby, h1 only on title slides', () => {
    expect(rules(slide('<h2>Second</h2>'))).toContain('heading');
    expect(rules(slide('').replace('aria-labelledby="s-h"', ''))).toContain('heading');
    expect(rules(slide('').replace('statement', 'title'))).toContain('heading');
    const nested =
      '<section class="slide" data-type="statement" data-id="s" aria-labelledby="s-h"><div><h2 id="s-h">T</h2></div></section>';
    expect(rules(nested)).toContain('heading');
  });

  it('enforces contiguous fragments', () => {
    expect(rules(slide('<p data-fragment="1">a</p><p data-fragment="3">b</p>'))).toContain(
      'fragments',
    );
  });

  it('requires a presenter script for every build step', () => {
    const noScript =
      '<section class="slide" data-type="statement" data-id="s" aria-labelledby="s-h"><h2 id="s-h">T</h2><p data-fragment="1">a</p><aside class="notes"><p data-step="0">x</p></aside></section>';
    expect(lintSlide('x.html', noScript, icons).map((i) => i.message)).toEqual([
      'notes have no script for step 1 (add data-step="1")',
    ]);
    const tooHigh = noScript.replace(
      'data-step="0">x',
      'data-step="0">x</p><p data-step="1">y</p><p data-step="2">z',
    );
    expect(lintSlide('x.html', tooHigh, icons).map((i) => i.rule)).toEqual(['script']);
  });

  it('caps on-screen words at 30 unless exempt, ignoring notes and SVG titles', () => {
    const many = `<p>${'word '.repeat(30)}</p>`;
    expect(rules(slide(many))).toContain('words');
    expect(rules(slide(many, 'data-wordcount="exempt"'))).not.toContain('words');
    const notes = `<aside class="notes"><p>${'word '.repeat(80)}</p></aside>`;
    expect(rules(slide(notes))).not.toContain('words');
    expect(countWords('Wi-Fi 6 is - fast')).toBe(4);
  });

  it('enforces the on-screen copy voice', () => {
    for (const text of [
      'a — b',
      'Wow!',
      'A → B',
      '~23 Gbps',
      '≈ same',
      '2×2',
      'Wi-Fi 1*',
      'WPAN ⊂ WLAN',
    ]) {
      expect(rules(slide(`<p>${text}</p>`)), text).toContain('copy');
    }
    expect(rules(slide('<p>Fast \u{1F680}</p>'))).toContain('emoji');
  });

  it('rejects inline styles, scripts, handlers and remote resources', () => {
    expect(rules(slide('<p style="color:red">a</p>'))).toContain('style');
    expect(rules(slide('<script></script>'))).toContain('markup');
    expect(rules(slide('<p onclick="x()">a</p>'))).toContain('markup');
    expect(rules(slide('<img src="https://example.com/a.png" alt="">'))).toContain('offline');
    expect(rules(slide('<a href="https://example.com">ref</a>'))).not.toContain('offline');
  });

  it('only allows whitelisted, empty icons', () => {
    expect(rules(slide('<i data-icon="rocket"></i>'))).toContain('icons');
    expect(rules(slide('<i>emphasis</i>'))).toContain('icons');
    expect(rules(slide('<i data-icon="wifi">x</i>'))).toContain('icons');
  });

  it('requires table captions and th scope', () => {
    expect(rules(slide('<table><tr><th>a</th></tr></table>'))).toEqual(['tables', 'tables']);
  });

  it('checks SVG title, role, dgm- classes and paint attributes', () => {
    const ok = '<svg role="img"><title>T</title><rect class="dgm-node"/></svg>';
    expect(rules(slide(ok))).toEqual([]);
    expect(rules(slide('<svg role="img"><rect class="dgm-node"/></svg>'))).toContain('svg');
    expect(rules(slide('<svg><title>T</title></svg>'))).toContain('svg');
    expect(rules(slide('<svg role="img"><title>T</title><rect class="box"/></svg>'))).toContain(
      'svg',
    );
    expect(rules(slide('<svg role="img"><title>T</title><rect fill="red"/></svg>'))).toContain(
      'svg',
    );
    expect(
      rules(slide('<svg role="img"><title>T</title><rect stroke-width="2"/></svg>')),
    ).toContain('svg');
    expect(rules(slide('<svg role="img"><title>T</title><rect mask="url(#m)"/></svg>'))).toContain(
      'svg',
    );
  });

  it('flags data-todo as a todo and duplicate ids across slides', () => {
    const issues = lintSlide('x.html', slide('<p data-todo="confirm C2">a</p>'), icons);
    expect(issues.map((i) => i.severity)).toEqual(['todo']);
    const dupes = lintDeck(
      [
        { file: 'a.html', source: slide('') },
        { file: 'b.html', source: slide('') },
      ],
      icons,
    );
    // Same data-id, and the same heading id, in two files.
    expect(dupes.map((i) => i.rule)).toEqual(['id', 'id']);
    expect(dupes.map((i) => i.message)).toEqual([
      'element id "s-h" is also used in a.html',
      'data-id "s" is also used by a.html',
    ]);
  });
});
