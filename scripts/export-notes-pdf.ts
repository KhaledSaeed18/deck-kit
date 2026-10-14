/**
 * `pnpm notes:pdf [profile]`: writes out/presenter-script-<profile>.pdf, one A4 page per slide of the talk
 * (the default profile unless one is named),
 * with only what the speaker says: the step-by-step Script, Next, Acronyms and If asked.
 * No timings, no slide numbers, no "More detail" section. Pages are numbered in the footer.
 * Long pages shrink their text until they fit on one page.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { Window } from 'happy-dom';
import { manifest } from '../src/deck.ts';

const root = resolve(import.meta.dirname, '..');
const slidesDir = resolve(root, 'src/slides');
const outDir = resolve(root, 'out');
mkdirSync(outDir, { recursive: true });

const domWindow = new Window();
const domDocument = domWindow.document;
const slides = new Map<string, Element>();
for (const file of readdirSync(slidesDir).filter((f) => f.endsWith('.html'))) {
  const template = domDocument.createElement('template');
  template.innerHTML = readFileSync(resolve(slidesDir, file), 'utf8');
  const section = template.content.firstElementChild;
  const id = section?.getAttribute('data-id');
  if (section && id) slides.set(id, section as unknown as Element);
}

const profile = process.argv[2] ?? manifest.defaultProfile;
if (!manifest.profiles[profile]) throw new Error(`no profile "${profile}" in src/deck.ts`);

const KEEP = new Set(['Script', 'Next', 'Acronyms', 'If asked']);
const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = (node: Element): string => (node.textContent ?? '').replace(/\s+/g, ' ').trim();

/** The kept sections of one slide's notes, as clean HTML. */
function speakerParts(aside: Element): string {
  const out: string[] = [];
  let keep = false;
  for (const child of Array.from(aside.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === 'h3') {
      keep = KEEP.has(text(child));
      if (keep) out.push(`<h2>${escapeHtml(text(child))}</h2>`);
      continue;
    }
    if (!keep || tag === 'details') continue;
    // This PDF follows one talk: drop lines meant only for another profile.
    const only = child.getAttribute('data-profile');
    if (only && only !== profile) continue;
    if (child.hasAttribute('data-step')) {
      const step = child.getAttribute('data-step');
      const label = step === '0' ? 'As the slide appears' : `Step ${step}`;
      out.push(`<div class="step"><div class="label">${label}</div>${child.innerHTML}</div>`);
    } else {
      out.push(child.outerHTML);
    }
  }
  return out.join('\n');
}

const fontFile = (path: string): string => pathToFileURL(resolve(root, 'node_modules', path)).href;
const pages = (manifest.profiles[profile] ?? [])
  .map((entry) => slides.get(entry.id))
  .filter((section): section is Element => section !== undefined)
  .map((section) => {
    const heading = section.querySelector('h1, h2');
    const aside = section.querySelector('aside.notes');
    return `<section class="page"><div class="body"><h1>${escapeHtml(heading ? text(heading) : '')}</h1>${
      aside ? speakerParts(aside) : ''
    }</div></section>`;
  });

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
@font-face { font-family: "Archivo Black"; src: url(${fontFile('@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff2')}) format("woff2"); }
@font-face { font-family: "Space Grotesk"; font-weight: 300 700; src: url(${fontFile('@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2')}) format("woff2-variations"); }
/* Notes PDF palette and fonts: keep in step with src/theme when the design changes. */
:root { --ink: #1a1815; --paper: #fff7e8; --card: #fff; --chip: #ffdc58; --line: #000; --accent: #ff9f1c; --muted: #4f493f; --soft: #f5eedd; }
@page { size: A4; margin: 0; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; }
body { font-family: "Space Grotesk", system-ui, sans-serif; color: var(--ink); }
.page { width: 210mm; height: 297mm; padding: 16mm 16mm 20mm; overflow: hidden; break-after: page; background: var(--paper); }
.page:last-child { break-after: auto; }
.body { height: 100%; overflow: hidden; font-size: 12pt; line-height: 1.4; }
h1 { margin: 0 0 0.9em; padding-bottom: 0.35em; font-family: "Archivo Black", sans-serif; font-weight: 400; font-size: 1.75em; line-height: 1.1; border-bottom: 3px solid var(--ink); }
h2 { display: inline-block; margin: 1.1em 0 0.5em; padding: 0.05em 0.45em; font-family: "Archivo Black", sans-serif; font-weight: 400; font-size: 0.8em; letter-spacing: 0.06em; text-transform: uppercase; background: var(--chip); border: 2px solid var(--line); border-radius: 4px; }
p { margin: 0 0 0.45em; }
.step { margin: 0 0 0.6em; padding: 0.35em 0.7em; background: var(--card); border-left: 5px solid var(--accent); border-radius: 3px; }
.label { font-family: "Archivo Black", sans-serif; font-size: 0.72em; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.15em; }
ul { margin: 0; padding-left: 1.2em; }
li { margin: 0 0 0.35em; }
ul.acronyms { display: flex; flex-wrap: wrap; gap: 0.35em; padding: 0; list-style: none; font-size: 0.9em; }
ul.acronyms li { margin: 0; padding: 0.1em 0.45em; background: var(--soft); border: 1.5px solid var(--line); border-radius: 3px; }
</style></head><body>${pages.join('\n')}</body></html>`;

const htmlFile = resolve(outDir, `presenter-script-${profile}.html`);
writeFileSync(htmlFile, html);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlFile).href);
  await page.evaluate(() => document.fonts.ready);
  // Shrink any page whose content does not fit, in small steps, down to a readable floor.
  const shrunk = await page.evaluate(() => {
    const report: string[] = [];
    for (const body of document.querySelectorAll<HTMLElement>('.body')) {
      let size = 12;
      while (body.scrollHeight > body.clientHeight && size > 8.5) {
        size -= 0.25;
        body.style.fontSize = `${size}pt`;
      }
      if (size < 12) report.push(`${body.querySelector('h1')?.textContent}: ${size}pt`);
      if (body.scrollHeight > body.clientHeight) report.push('STILL OVERFLOWS');
    }
    return report;
  });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;font-size:9pt;color:#4f493f;text-align:center;font-family:sans-serif;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '0', bottom: '10mm' },
  });
  const target = resolve(outDir, `presenter-script-${profile}.pdf`);
  writeFileSync(target, pdf);
  const count = (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
  console.log(`wrote ${target}: ${count} pages for ${pages.length} slides`);
  if (shrunk.length) console.log(`shrunk to fit: ${shrunk.join('; ')}`);
} finally {
  await browser.close();
  await domWindow.happyDOM.close();
}
