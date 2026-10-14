import { expect, FULL_COUNT, TEN_COUNT, test } from './fixtures.ts';

const pageCount = (pdf: Buffer) =>
  (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length;

test('print media shows every slide fully built, one per page, no chrome', async ({ page }) => {
  await page.goto('/index.html#/2');
  await page.emulateMedia({ media: 'print' });
  const slides = page.locator('.stage > .slide');
  await expect(slides).toHaveCount(FULL_COUNT);
  for (const slide of await slides.all()) await expect(slide).toBeVisible();
  for (const fragment of await page.locator('.stage [data-fragment]').all()) {
    await expect(fragment).toHaveCSS('visibility', 'visible');
    await expect(fragment).toHaveCSS('opacity', '1');
  }
  await expect(page.locator('.deck-chrome')).toBeHidden();
  // Print keeps each slide type's own theme layout (the engine does not force display).
  await expect(slides.first()).toHaveCSS('display', 'flex');
  const sizes = await slides.evaluateAll((els: HTMLElement[]) =>
    els.map((el) => [el.offsetWidth, el.offsetHeight]),
  );
  expect(sizes).toEqual(Array(FULL_COUNT).fill([1920, 1080]));
});

for (const [profile, expected] of [
  ['full', FULL_COUNT],
  ['10min', TEN_COUNT],
] as const) {
  test(`PDF of the ${profile} profile has one page per slide`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'page.pdf() is Chromium-only in Playwright');
    await page.goto(`/index.html?profile=${profile}#/1`);
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    expect(pageCount(pdf)).toBe(expected);
  });
}
