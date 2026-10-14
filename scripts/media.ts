/**
 * `pnpm media`: regenerates the README visuals in docs/media/ from the starter deck:
 * - screenshots of the production build (deck, a build step, overview, help, presenter)
 * - sync.gif: the deck and presenter windows side by side, moving together (needs ffmpeg)
 * - the illustrations in docs/media/src/*.html, rendered at 2x with the bundled fonts;
 *   lint.html gets real slide-lint output for a deliberately broken slide
 * - examples/<name>-*.png: a few slides and the presenter of each example deck (examples/*)
 * Run with `pnpm media` (it builds the starter deck and the examples first).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Browser, chromium, type Page } from '@playwright/test';
import { Window } from 'happy-dom';
import { preview } from 'vite';

const root = resolve(import.meta.dirname, '..');
const media = resolve(root, 'docs/media');
const src = resolve(media, 'src');
const base = 'http://127.0.0.1:4177';

async function settle(page: Page): Promise<void> {
  await page.waitForSelector('.stage > .slide[data-current], .presenter-current .slide');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

async function screens(browser: Browser): Promise<void> {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const shot = async (hash: string, name: string, keys: readonly string[] = []) => {
    await page.goto(`${base}/index.html${hash}`);
    await settle(page);
    for (const key of keys) await page.keyboard.press(key);
    if (keys.length) await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(media, name) });
  };
  await shot('#/1', 'deck-title.png');
  await shot('#/4/2', 'deck-build.png');
  await shot('#/5', 'deck-diagram.png');
  await shot('#/3', 'overview.png', ['o', 'ArrowRight']);
  await shot('#/1', 'help.png', ['Shift+Slash']);
  // The presenter shows "Linked to deck" only with a deck window open in the same browser.
  await page.goto(`${base}/index.html#/4/2`);
  await settle(page);
  const presenter = await context.newPage();
  await presenter.goto(`${base}/presenter.html#/4/2`);
  await settle(presenter);
  await presenter.locator('[data-status][data-linked]').waitFor();
  await presenter.screenshot({ path: resolve(media, 'presenter.png') });
  await context.close();
}

/** Slides worth showing from each example deck, fully built at the given step. */
const EXAMPLES: readonly {
  name: string;
  mode: string;
  slides: readonly string[];
  presenter: string;
}[] = [
  {
    name: 'wifi',
    mode: 'example',
    slides: ['#/1', '#/3/4', '#/7/6', '#/12/5'],
    presenter: '#/7/3',
  },
  {
    name: 'crypto',
    mode: 'example-crypto',
    slides: ['#/1/1', '#/7/4', '#/13/2', '#/4/3'],
    presenter: '#/7/3',
  },
];

async function exampleScreens(browser: Browser): Promise<void> {
  mkdirSync(resolve(media, 'examples'), { recursive: true });
  for (const [i, example] of EXAMPLES.entries()) {
    const port = 4178 + i;
    const url = `http://127.0.0.1:${port}`;
    const server = await preview({
      root,
      mode: example.mode,
      preview: { port, strictPort: true, host: '127.0.0.1' },
    });
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    try {
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const [n, hash] of example.slides.entries()) {
        await page.goto(`${url}/index.html${hash}`);
        await settle(page);
        await page.screenshot({ path: resolve(media, `examples/${example.name}-${n + 1}.png`) });
      }
      await page.goto(`${url}/index.html${example.presenter}`);
      await settle(page);
      const presenter = await context.newPage();
      await presenter.emulateMedia({ reducedMotion: 'reduce' });
      await presenter.goto(`${url}/presenter.html${example.presenter}`);
      await settle(presenter);
      await presenter.locator('[data-status][data-linked]').waitFor();
      await presenter.screenshot({
        path: resolve(media, `examples/${example.name}-presenter.png`),
      });
    } finally {
      await context.close();
      await new Promise<void>((done) => server.httpServer.close(() => done()));
    }
  }
}

/** Records both windows while the deck is driven from either side, then stacks them. */
async function syncGif(browser: Browser): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'deck-media-'));
  const size = { width: 1280, height: 720 };
  const context = await browser.newContext({
    viewport: size,
    recordVideo: { dir, size },
  });
  const deck = await context.newPage();
  await deck.goto(`${base}/index.html#/3`);
  const presenter = await context.newPage();
  await presenter.goto(`${base}/presenter.html#/3`);
  await settle(deck);
  await settle(presenter);
  await deck.waitForTimeout(900);
  const beats: [Page, string][] = [
    [deck, 'PageDown'],
    [deck, 'PageDown'],
    [deck, 'PageDown'],
    [presenter, 'PageDown'],
    [presenter, 'PageDown'],
    [presenter, 'PageDown'],
    [deck, 'PageDown'],
  ];
  for (const [page, key] of beats) {
    await page.keyboard.press(key);
    await page.waitForTimeout(1000);
  }
  const deckVideo = deck.video();
  const presenterVideo = presenter.video();
  await context.close();
  const [a, b] = [await deckVideo?.path(), await presenterVideo?.path()];
  if (!a || !b) throw new Error('no video recorded');
  const out = resolve(media, 'sync.gif');
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-ss',
    '1.2',
    '-i',
    a,
    '-ss',
    '1.2',
    '-i',
    b,
    '-filter_complex',
    '[0:v]scale=600:-2,pad=iw+12:ih:0:0:color=0x1a1815[l];[1:v]scale=600:-2[r];' +
      '[l][r]hstack,fps=12,split[x][y];[x]palettegen=max_colors=96[p];[y][p]paletteuse=dither=bayer:bayer_scale=4',
    out,
  ]);
  rmSync(dir, { recursive: true, force: true });
}

/** Real lint output for a slide with the usual first-draft mistakes. */
async function lintOutput(): Promise<string> {
  const window = new Window();
  Object.assign(globalThis, { document: window.document });
  const { lintSlide } = await import('../src/engine/validate.ts');
  const { ICON_NAMES } = await import('../src/assets/icons.ts');
  const broken = `<section class="slide" data-type="statement" data-id="draft" aria-labelledby="draft-h">
  <h2 id="draft-h">Results — and why they matter!</h2>
  <p data-fragment="1">Throughput went up 3× after the change</p>
  <p data-fragment="3" style="color: red">Latency → down</p>
  <table><tr><th>Before</th><th>After</th></tr></table>
  <aside class="notes"><div data-step="0"><p>Intro.</p></div></aside>
</section>`;
  const issues = lintSlide('05-results.html', broken, ICON_NAMES);
  await window.happyDOM.close();
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = issues.map(
    (i) => `<span class="f">${i.file}</span> <span class="r">[${i.rule}]</span> ${esc(i.message)}`,
  );
  return [
    '<span class="p">$</span> pnpm check:slides',
    '',
    ...lines,
    '',
    `<span class="x">${issues.length} problems</span>`,
  ].join('\n');
}

async function illustrations(browser: Browser): Promise<void> {
  const page = await browser.newPage({
    viewport: { width: 1300, height: 1000 },
    deviceScaleFactor: 2,
  });
  const lint = await lintOutput();
  for (const file of readdirSync(src).filter((f) => f.endsWith('.html'))) {
    let path = resolve(src, file);
    let temp: string | undefined;
    if (file === 'lint.html') {
      temp = resolve(src, '.lint.rendered.html');
      writeFileSync(temp, readFileSync(path, 'utf8').replace('{{LINT}}', lint));
      path = temp;
    }
    await page.goto(pathToFileURL(path).href);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.canvas').screenshot({
      path: resolve(media, file.replace(/\.html$/, '.png')),
      omitBackground: true,
    });
    if (temp) rmSync(temp);
  }
}

const server = await preview({
  root,
  preview: { port: 4177, strictPort: true, host: '127.0.0.1' },
});
const browser = await chromium.launch();
try {
  await screens(browser);
  await exampleScreens(browser);
  await syncGif(browser);
  await illustrations(browser);
  console.log(`wrote ${media}`);
} finally {
  await browser.close();
  await new Promise<void>((done) => server.httpServer.close(() => done()));
}
