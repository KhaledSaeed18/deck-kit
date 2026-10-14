import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, FULL_COUNT, test } from './fixtures.ts';

test('deck and presenter load from dist with the network blocked', async ({ page, guard }) => {
  const seen: string[] = [];
  page.on('request', (r) => seen.push(r.url()));
  await page.goto('/index.html');
  await expect(page.locator('.stage > .slide')).toHaveCount(FULL_COUNT);
  await page.goto('/presenter.html');
  await expect(page.locator('.presenter-current .slide')).toHaveCount(1);
  expect(guard.blocked).toEqual([]);
  expect(seen.every((u) => u.startsWith('http://127.0.0.1:4173/'))).toBe(true);
  expect(seen.length).toBeGreaterThan(2);
});

test('single-file deck.html makes no requests beyond itself', async ({ page }) => {
  const seen: string[] = [];
  page.on('request', (r) => seen.push(r.url()));
  const url = pathToFileURL(
    resolve(import.meta.dirname, '../../../dist-example-single/deck.html'),
  ).href;
  await page.goto(url);
  await expect(page.locator('.stage > .slide')).toHaveCount(FULL_COUNT);
  expect(seen.filter((u) => !u.startsWith('data:'))).toEqual([url]);
});

test('the network guard really blocks and records outside requests (self-test)', async ({
  page,
  guard,
}) => {
  await page.goto('/index.html');
  const failed = await page.evaluate(() =>
    fetch('https://example.com/probe.js').then(
      () => false,
      () => true,
    ),
  );
  expect(failed).toBe(true);
  expect(guard.blocked).toEqual(['https://example.com/probe.js']);
  guard.blocked.length = 0; // expected for this test only
  guard.consoleErrors.length = 0;
});

test('deck.html runs with the browser fully offline (Wi-Fi off)', async ({ context, page }) => {
  await context.setOffline(true);
  const url = pathToFileURL(
    resolve(import.meta.dirname, '../../../dist-example-single/deck.html'),
  ).href;
  await page.goto(`${url}#/7/6`);
  await expect(page.locator('.stage > .slide[data-current]')).toHaveAttribute(
    'data-id',
    'generations',
  );
  await expect(page.locator('.stage > .slide[data-current] tbody tr').last()).toBeVisible();
  // Icons are inlined (lucide), not fetched.
  await page.goto(`${url}#/6/4`);
  expect(await page.locator('.stage > .slide[data-current] svg.icon').count()).toBe(3);
});
