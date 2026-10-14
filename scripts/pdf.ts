/**
 * `pnpm pdf`: writes out/deck-<profile>.pdf for every profile in src/deck.ts from the production build,
 * one 1920x1080 page per slide with every fragment revealed. Chrome is the guaranteed target.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { manifest } from '../src/deck.ts';

const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'out');
mkdirSync(outDir, { recursive: true });

const server = await preview({
  root,
  preview: { port: 4174, strictPort: true, host: '127.0.0.1' },
});
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  // The PDF must be built from bundled files only.
  await context.route('**/*', (route) =>
    route.request().url().startsWith('http://127.0.0.1:4174/') ? route.continue() : route.abort(),
  );
  const page = await context.newPage();
  for (const profile of Object.keys(manifest.profiles)) {
    await page.goto(`http://127.0.0.1:4174/index.html?profile=${profile}#/1`);
    await page.waitForSelector('.stage > .slide');
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const file = resolve(outDir, `deck-${profile}.pdf`);
    writeFileSync(file, pdf);
    const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
    console.log(`${file}: ${pages} pages`);
  }
} finally {
  await browser.close();
  await new Promise<void>((done) => server.httpServer.close(() => done()));
}
