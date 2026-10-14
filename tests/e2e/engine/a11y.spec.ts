import AxeBuilder from '@axe-core/playwright';
import { expect, FULL_COUNT, test } from './fixtures.ts';

/** axe-core on every slide, fully built, and on the presenter window. */
test('every slide passes axe (WCAG 2.x A/AA) when fully built', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'one engine is enough for the axe audit');
  const failures: string[] = [];
  for (let n = 1; n <= FULL_COUNT; n++) {
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

test('presenter window passes axe', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'one engine is enough for the axe audit');
  await page.goto('/presenter.html#/3/2');
  await page.locator('.presenter-current .slide').waitFor();
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([]);
});
