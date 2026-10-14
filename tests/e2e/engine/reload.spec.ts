import { currentSlideId, expect, FULL_COUNT, fragmentStates, hash, test } from './fixtures.ts';

test('refresh keeps slide and fragment position', async ({ page }) => {
  await page.goto('/index.html#/7');
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  expect(await hash(page)).toBe('#/7/2');
  await page.reload();
  expect(await hash(page)).toBe('#/7/2');
  expect(await fragmentStates(page)).toEqual([
    ...Array(4).fill('visible'),
    'current',
    ...Array(4).fill('hidden'),
  ]);
});

test('the back button walks slide by slide, not step by step', async ({ page }) => {
  await page.goto('/index.html#/1');
  for (let i = 0; i < 4; i++) await page.keyboard.press('PageDown');
  expect(await hash(page)).toBe('#/3/1');
  await page.goBack();
  expect(await hash(page)).toBe('#/2/1');
  expect(await currentSlideId(page)).toBe('hook');
  await page.goBack();
  expect(await hash(page)).toBe('#/1');
  await page.goForward();
  expect(await currentSlideId(page)).toBe('hook');
});

test('out-of-range and malformed hashes clamp and normalise', async ({ page }) => {
  await page.goto('/index.html#/99/99');
  expect(await hash(page)).toBe(`#/${FULL_COUNT}`);
  await page.goto('/index.html#/2/7');
  expect(await hash(page)).toBe('#/2/1');
  await page.goto('/index.html#/0');
  expect(await hash(page)).toBe('#/1');
});
