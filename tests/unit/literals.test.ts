import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Layer rule (plan §3): no visual literals outside src/theme/. Scans the engine (TS + CSS),
 * the entry files and the slide partials for colours, fonts, shadows, radii and lengths.
 * The 1920x1080 canvas and 0/1px utility values are the only lengths allowed.
 */

const root = join(import.meta.dirname, '../..');
const SCANNED = [
  'src/engine',
  'src/main.ts',
  'src/presenter.ts',
  'src/deck.ts',
  'src/content.ts',
  'src/slides',
  'src/assets',
  'examples/wifi/deck.ts',
  'examples/wifi/content.ts',
  'examples/wifi/slides',
  'examples/crypto/deck.ts',
  'examples/crypto/content.ts',
  'examples/crypto/slides',
];

function files(path: string): string[] {
  const full = join(root, path);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full).flatMap((name) => files(join(path, name)));
}

const COLOR_NAMES =
  'black|white|red|green|blue|yellow|orange|purple|gray|grey|pink|brown|navy|teal|silver|gold|cyan|magenta';
const PATTERNS: readonly { name: string; pattern: RegExp }[] = [
  { name: 'hex colour', pattern: /#[0-9a-f]{3,8}\b(?![-\w/])/gi },
  { name: 'colour function', pattern: /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\(/gi },
  {
    name: 'named colour',
    pattern: new RegExp(
      `(?:color|background|fill|stroke|border)[\\w-]*\\s*:\\s*[^;]*\\b(?:${COLOR_NAMES})\\b`,
      'gi',
    ),
  },
  {
    name: 'font declaration',
    pattern: /\bfont(?:-family|-size|-weight)?\s*:(?!\s*(?:var\(|inherit))/gi,
  },
  { name: 'shadow', pattern: /\b(?:box|text)-shadow\s*:(?!\s*(?:var\(|none))/gi },
  { name: 'radius', pattern: /\bborder-radius\s*:(?!\s*var\()/gi },
  { name: 'length', pattern: /(?<![\w.#-])-?\d*\.?\d+(?:px|rem|em|pt|vh|vw|vmin|vmax)\b/gi },
  { name: 'duration', pattern: /(?<![\w.-])\d*\.?\d+m?s\b(?=[\s;,)'"`])/gi },
];
const ALLOWED_LENGTHS = new Set(['1920px', '1080px', '0px', '1px', '-1px']);

function stripComments(text: string, file: string): string {
  if (file.endsWith('.css')) return text.replace(/\/\*[\s\S]*?\*\//g, '');
  if (file.endsWith('.html')) return text.replace(/<!--[\s\S]*?-->/g, '');
  // TS: drop block and line comments (good enough for this codebase: no URLs in strings).
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

function findLiterals(file: string): string[] {
  const text = stripComments(readFileSync(file, 'utf8'), file);
  const hits: string[] = [];
  for (const { name, pattern } of PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      if (name === 'length' && ALLOWED_LENGTHS.has(match[0].toLowerCase())) continue;
      // SVG viewBox numbers and data-fragment values carry no unit, so they never match.
      hits.push(`${relative(root, file)}: ${name} "${match[0].trim()}"`);
    }
  }
  return hits;
}

describe('no visual literals outside src/theme', () => {
  const scanned = SCANNED.flatMap(files).filter((f) => /\.(ts|css|html)$/.test(f));

  it('scans the engine, entries and slides', () => {
    expect(scanned.some((f) => f.endsWith('engine.css'))).toBe(true);
    expect(scanned.length).toBeGreaterThan(20);
  });

  it('finds none', () => {
    expect(scanned.flatMap(findLiterals)).toEqual([]);
  });

  it('theme files other than tokens.css use tokens, not raw colours or lengths', () => {
    const themeFiles = files('src/theme').filter(
      (f) => f.endsWith('.css') && !f.endsWith('tokens.css'),
    );
    expect(themeFiles.length).toBeGreaterThan(4);
    const raw =
      /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch)\(|(?<![\w.#-])\d*\.?[1-9]\d*(?:px|rem|em|pt|vh|vw|ms|s)\b/gi;
    const hits = themeFiles.flatMap((f) =>
      [...stripComments(readFileSync(f, 'utf8'), f).matchAll(raw)].map(
        (m) => `${relative(root, f)}: "${m[0]}"`,
      ),
    );
    expect(hits).toEqual([]);
  });

  it('would catch a literal (self-test)', () => {
    const probe = (css: string) =>
      PATTERNS.some(({ name, pattern }) =>
        [...css.matchAll(pattern)].some((m) => !(name === 'length' && ALLOWED_LENGTHS.has(m[0]))),
      );
    for (const bad of [
      'color: #ff0000',
      'background: rgb(0 0 0)',
      'font-family: Arial',
      'padding: 24px',
      'box-shadow: 2px 2px',
      'border-radius: 4px',
      'transition: opacity 200ms ease',
      'color: red',
      'max-height: 40vh',
    ]) {
      expect(probe(bad), bad).toBe(true);
    }
    for (const good of [
      'color: var(--foreground)',
      'width: 1920px',
      'transform: scale(var(--scale))',
      'font: inherit',
    ]) {
      expect(probe(good), good).toBe(false);
    }
  });
});
