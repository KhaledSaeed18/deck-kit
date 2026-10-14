import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { manifest } from '../../../src/deck.ts';
import { expect, test } from '../engine/fixtures.ts';

/**
 * Generic checks on your own deck (src/). Slide counts come from src/deck.ts, so these tests
 * need no edits when the content changes.
 */
const profiles = Object.entries(manifest.profiles).map(([name, slides]) => ({
  name,
  count: slides.length,
}));
const main = profiles.find((p) => p.name === manifest.defaultProfile) ?? profiles[0];
const pageCount = (pdf: Buffer) =>
  (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

for (const { name, count } of profiles) {
  test(`${name}: every slide renders, fills the stage and fits the 1920x1080 canvas`, async ({
    page,
  }) => {
    for (let n = 1; n <= count; n++) {
      await page.goto(`/index.html?profile=${name}#/${n}/99`);
      const current = page.locator('.stage > .slide[data-current]');
      await expect(current, `slide ${n}`).toHaveCount(1);
      await expect(current.locator('h1, h2').first(), `slide ${n} heading`).toBeVisible();
      const fit = await current.evaluate((el) => {
        const stage = document.querySelector('.stage')?.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        return {
          fills: !!stage && box.width === stage.width && box.height === stage.height,
          overflowX: el.scrollWidth - el.clientWidth,
          overflowY: el.scrollHeight - el.clientHeight,
        };
      });
      expect(fit.fills, `slide ${n} fills the stage`).toBe(true);
      expect(fit.overflowY, `slide ${n}: content taller than the canvas`).toBeLessThanOrEqual(1);
      expect(fit.overflowX, `slide ${n}: content wider than the canvas`).toBeLessThanOrEqual(1);
    }
  });

  test(`${name}: the PDF has one page per slide`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'page.pdf() is Chromium-only in Playwright');
    await page.goto(`/index.html?profile=${name}#/1`);
    await page.locator('.stage > .slide').first().waitFor();
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(pageCount(pdf)).toBe(count);
  });
}

test('every slide passes axe (WCAG 2.1 A/AA) when fully built', async ({ page }) => {
  const failures: string[] = [];
  for (let n = 1; n <= (main?.count ?? 0); n++) {
    await page.goto(`/index.html#/${n}/99`);
    await page.locator('.stage > .slide[data-current]').waitFor();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    for (const v of result.violations) {
      failures.push(`slide ${n}: ${v.id} (${v.impact}) ${v.nodes.length} node(s): ${v.help}`);
    }
  }
  expect(failures).toEqual([]);
});

test('the presenter window loads with notes for every slide', async ({ page }) => {
  for (let n = 1; n <= (main?.count ?? 0); n++) {
    await page.goto(`/presenter.html#/${n}`);
    await expect(page.locator('.presenter-current .slide')).toHaveCount(1);
    await expect(page.locator('[data-notes]'), `slide ${n} notes`).not.toBeEmpty();
  }
});

test('single-file deck.html runs with the browser fully offline', async ({ context, page }) => {
  await context.setOffline(true);
  const seen: string[] = [];
  page.on('request', (r) => seen.push(r.url()));
  const url = pathToFileURL(resolve(import.meta.dirname, '../../../dist-single/deck.html')).href;
  await page.goto(`${url}#/1`);
  await expect(page.locator('.stage > .slide')).toHaveCount(main?.count ?? 0);
  expect(seen.filter((u) => !u.startsWith('data:'))).toEqual([`${url}#/1`.replace(/#.*$/, '')]);
});
