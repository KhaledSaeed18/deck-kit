/**
 * `pnpm shots [profile]`: screenshots of the production build for visual review, written to
 * out/shots/: every slide of the profile fully built (NN-<id>.png), the first build step of each
 * slide that has steps (NN-<id>-step1.png), and the presenter window on slide 2 (presenter.png).
 * Viewport 1600x900, so a 1920x1080 slide is scaled like on a laptop screen.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { manifest } from '../src/deck.ts';

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'out/shots');
const profile = process.argv[2] ?? manifest.defaultProfile;
const entries = manifest.profiles[profile];
if (!entries) throw new Error(`no profile "${profile}" in src/deck.ts`);
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const base = 'http://127.0.0.1:4176';
const server = await preview({
  root,
  preview: { port: 4176, strictPort: true, host: '127.0.0.1' },
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.route('**/*', (route) =>
    route.request().url().startsWith(base) ? route.continue() : route.abort(),
  );
  for (const [i, entry] of entries.entries()) {
    const n = i + 1;
    const name = `${String(n).padStart(2, '0')}-${entry.id}`;
    await page.goto(`${base}/index.html?profile=${profile}#/${n}/99`);
    await page.waitForSelector('.stage > .slide[data-current]');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(outDir, `${name}.png`) });
    const steps = await page.$$eval('.stage > .slide[data-current] [data-fragment]', (els) =>
      Math.max(0, ...els.map((el) => Number(el.getAttribute('data-fragment')))),
    );
    if (steps > 1) {
      await page.goto(`${base}/index.html?profile=${profile}#/${n}/1`);
      await page.waitForSelector('.stage > .slide[data-current]');
      await page.screenshot({ path: resolve(outDir, `${name}-step1.png`) });
    }
  }
  await page.goto(`${base}/presenter.html?profile=${profile}#/${Math.min(2, entries.length)}`);
  await page.waitForSelector('.presenter-current .slide');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(outDir, 'presenter.png') });
  console.log(`wrote ${outDir} (${entries.length} slides, profile ${profile})`);
} finally {
  await browser.close();
  await new Promise<void>((done) => server.httpServer.close(() => done()));
}
