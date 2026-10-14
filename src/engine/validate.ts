import { countSteps, fragmentProblems } from './fragments.ts';
import { parseFragment, rootSection, slideTitle } from './loader.ts';
import { SLIDE_TYPES } from './types.ts';

/**
 * Slide lint (plan §5). Runs in `pnpm check` (through vitest) and as a dev overlay.
 * Issues with severity `todo` mark content awaiting approval; `pnpm check` fails on them too.
 */

export type Severity = 'error' | 'todo';

export interface Issue {
  readonly file: string;
  readonly rule: string;
  readonly message: string;
  readonly severity: Severity;
}

export interface LintSource {
  readonly file: string;
  readonly source: string;
}

export const WORD_LIMIT = 30;

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
/** On-screen copy voice (decision S5). */
const COPY_RULES: readonly { pattern: RegExp; message: string }[] = [
  { pattern: /—/, message: 'no em dashes on screen' },
  { pattern: /!/, message: 'no exclamation marks on screen' },
  { pattern: /[←-⇿⟰-⟿⤀-⥿⬀-⯿]/, message: 'arrows must be icons' },
  { pattern: /[~≈]/, message: 'write "about" instead of "~" or "≈"' },
  { pattern: /×/, message: 'write "x" instead of "×"' },
  { pattern: /[⊂-⊇]/, message: 'show subsets by visual nesting, not a symbol' },
  { pattern: /\*/, message: 'use an "unofficial" tag instead of "*"' },
];
const SVG_PAINT =
  /^(?:fill|stroke|color|opacity|style|font|stop-|flood-|lighting-color|paint-order)/;
const REMOTE = /^\s*(?:https?:)?\/\//i;
const RESOURCE_ATTRS = ['src', 'srcset', 'poster', 'data', 'href', 'xlink:href', 'action'];
const FORBIDDEN_TAGS = ['script', 'style', 'link', 'iframe', 'object', 'embed', 'base', 'meta'];

/** On-screen text: everything except speaker notes and SVG titles/descriptions. */
export function onScreenText(section: Element): string {
  const clone = section.cloneNode(true) as Element;
  for (const hidden of clone.querySelectorAll('aside.notes, svg title, svg desc')) hidden.remove();
  // Separate block-level cells and SVG text runs so their words do not merge.
  for (const node of clone.querySelectorAll('*')) node.append(' ');
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

export function lintSlide(file: string, source: string, iconNames: readonly string[]): Issue[] {
  const issues: Issue[] = [];
  const add = (rule: string, message: string, severity: Severity = 'error'): void => {
    issues.push({ file, rule, message, severity });
  };

  const section = rootSection(parseFragment(source));
  if (!section) {
    add('root', 'a partial must contain exactly one root <section class="slide">');
    return issues;
  }

  // Identity and type.
  const id = section.dataset.id ?? '';
  if (!KEBAB.test(id)) add('id', `data-id "${id}" must be present and kebab-case`);
  const type = section.dataset.type ?? '';
  if (!(SLIDE_TYPES as readonly string[]).includes(type)) {
    add('type', `data-type "${type}" must be one of: ${SLIDE_TYPES.join(', ')}`);
  }

  // Exactly one heading, linked through aria-labelledby.
  const headings = Array.from(section.querySelectorAll('h1, h2')).filter(
    (h) => !h.closest('aside.notes'),
  );
  const [heading] = headings;
  if (headings.length !== 1 || !heading) {
    add('heading', `expected exactly one on-screen h1/h2, found ${headings.length}`);
  } else {
    const expected = type === 'title' ? 'H1' : 'H2';
    if (heading.tagName !== expected) {
      add('heading', `${type || 'this'} slide must use <${expected.toLowerCase()}>`);
    }
    if (!heading.id || section.getAttribute('aria-labelledby') !== heading.id) {
      add('heading', 'section aria-labelledby must point at the heading id');
    }
    // The title (live region, presenter, document title) is read from these positions only.
    if (!slideTitle(section)) {
      add('heading', 'the heading must be a direct child of the section (or of its <header>)');
    }
  }

  // Notes.
  const notes = section.querySelectorAll('aside.notes');
  if (notes.length > 1) add('notes', 'at most one <aside class="notes">');
  for (const aside of notes) {
    if (aside.parentElement !== section)
      add('notes', 'notes must be a direct child of the section');
  }

  // Fragments.
  for (const problem of fragmentProblems(section)) add('fragments', problem);
  for (const aside of notes) {
    if (aside.querySelector('[data-fragment]')) add('fragments', 'no fragments inside notes');
  }

  // Presenter script: one notes block per build step (0 = the slide as it appears), so the
  // presenter always has something to say for what is on screen.
  const steps = countSteps(section);
  const scripted = new Set<number>();
  for (const part of section.querySelectorAll('aside.notes [data-step]')) {
    const raw = part.getAttribute('data-step') ?? '';
    const n = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
    if (!Number.isInteger(n) || n > steps) {
      add('script', `notes data-step="${raw}" must be an integer from 0 to ${steps}`);
    } else {
      scripted.add(n);
    }
  }
  for (let n = 0; n <= steps; n++) {
    if (!scripted.has(n))
      add('script', `notes have no script for step ${n} (add data-step="${n}")`);
  }

  // Word cap and copy voice, on-screen text only.
  const text = onScreenText(section);
  const words = countWords(text);
  const exemption = section.dataset.wordcount;
  if (exemption !== undefined && exemption !== 'exempt') {
    add('words', 'data-wordcount may only be "exempt"');
  }
  if (exemption !== 'exempt' && words > WORD_LIMIT) {
    add('words', `${words} on-screen words (limit ${WORD_LIMIT}); move detail to the notes`);
  }
  if (PICTOGRAPHIC.test(source)) add('emoji', 'no emoji or pictographic characters');
  for (const rule of COPY_RULES) {
    if (rule.pattern.test(text)) add('copy', rule.message);
  }

  // Markup hygiene.
  for (const node of [section, ...section.querySelectorAll('*')]) {
    const tag = node.tagName.toLowerCase();
    if (FORBIDDEN_TAGS.includes(tag)) add('markup', `<${tag}> is not allowed in slides`);
    if (node.hasAttribute('style')) add('style', `inline style on <${tag}>; use theme tokens`);
    for (const attr of Array.from(node.attributes)) {
      if (attr.name.startsWith('on')) add('markup', `inline handler ${attr.name} on <${tag}>`);
      if (/url\(\s*#/.test(attr.value)) {
        add('svg', `url(#...) reference on <${tag}> breaks in previews (ids are stripped)`);
      }
      if (
        /^(?:xlink:)?href$/.test(attr.name) &&
        attr.value.startsWith('#') &&
        node.closest('svg')
      ) {
        add(
          'svg',
          `${attr.name}="${attr.value}" inside <svg> breaks in previews (ids are stripped)`,
        );
      }
    }
    for (const name of RESOURCE_ATTRS) {
      const value = node.getAttribute(name);
      if (value && REMOTE.test(value) && !(tag === 'a' && name === 'href')) {
        add('offline', `remote resource ${name}="${value}" on <${tag}>; bundle it locally`);
      }
    }
    if (node.hasAttribute('data-todo')) {
      add('todo', `awaiting approval: ${node.getAttribute('data-todo') || '(no note)'}`, 'todo');
    }
  }

  // Icons.
  for (const i of section.querySelectorAll('i')) {
    const name = i.getAttribute('data-icon');
    if (name === null) add('icons', '<i> is for icons only; use <em> for emphasis');
    else if (!iconNames.includes(name))
      add('icons', `icon "${name}" is not in src/assets/icons.ts`);
    else if (i.childNodes.length > 0) add('icons', `<i data-icon="${name}"> must be empty`);
  }

  // Tables.
  for (const table of section.querySelectorAll('table')) {
    if (!table.querySelector(':scope > caption')) add('tables', 'every table needs a <caption>');
    for (const th of table.querySelectorAll('th')) {
      if (!/^(?:col|row|colgroup|rowgroup)$/.test(th.getAttribute('scope') ?? '')) {
        add('tables', 'every <th> needs scope="col" or scope="row"');
        break;
      }
    }
  }

  // SVG diagrams.
  for (const svg of section.querySelectorAll('svg')) {
    const first = svg.firstElementChild;
    if (first?.tagName.toLowerCase() !== 'title' || !first.textContent?.trim()) {
      add('svg', '<svg> must start with a non-empty <title>');
    }
    if (svg.getAttribute('role') !== 'img') add('svg', '<svg> needs role="img"');
    for (const node of [svg, ...svg.querySelectorAll('*')]) {
      for (const attr of Array.from(node.attributes)) {
        if (SVG_PAINT.test(attr.name)) {
          add(
            'svg',
            `paint attribute ${attr.name} on <${node.tagName.toLowerCase()}>; style via dgm-* classes`,
          );
        }
      }
      for (const cls of (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)) {
        if (!cls.startsWith('dgm-')) add('svg', `SVG class "${cls}" must use the dgm- prefix`);
      }
    }
  }

  return issues;
}

/** Lints every partial plus the cross-slide rules: unique data-id, and unique element ids
 * (all slides share one document, so a repeated id breaks aria-labelledby). */
export function lintDeck(sources: readonly LintSource[], iconNames: readonly string[]): Issue[] {
  const issues = sources.flatMap(({ file, source }) => lintSlide(file, source, iconNames));
  const elementIds = new Map<string, string>();
  for (const { file, source } of sources) {
    const section = rootSection(parseFragment(source));
    for (const el of section?.querySelectorAll('[id]') ?? []) {
      const other = elementIds.get(el.id);
      if (other && other !== file) {
        issues.push({
          file,
          rule: 'id',
          message: `element id "${el.id}" is also used in ${other}`,
          severity: 'error',
        });
      } else {
        elementIds.set(el.id, file);
      }
    }
  }
  const seen = new Map<string, string>();
  for (const { file, source } of sources) {
    const id = rootSection(parseFragment(source))?.dataset.id;
    if (!id) continue;
    const other = seen.get(id);
    if (other) {
      issues.push({
        file,
        rule: 'id',
        message: `data-id "${id}" is also used by ${other}`,
        severity: 'error',
      });
    } else {
      seen.set(id, file);
    }
  }
  return issues;
}

export function formatIssues(issues: readonly Issue[]): string {
  return issues
    .map(
      (i) =>
        `${i.file} [${i.rule === 'todo' || i.severity !== 'todo' ? i.rule : `${i.rule}, todo`}] ${i.message}`,
    )
    .join('\n');
}
