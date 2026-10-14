import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { BrowserContext, Page } from '@playwright/test';
import { expect, FULL_COUNT, hash, TEN_COUNT, test } from './fixtures.ts';

async function openPresenter(context: BrowserContext, deck: Page): Promise<Page> {
  const popupPromise = context.waitForEvent('page');
  await deck.keyboard.press('p');
  const presenter = await popupPromise;
  await presenter.waitForLoadState();
  await expect(presenter.locator('[data-status]')).toHaveText('Linked to deck');
  return presenter;
}

const counter = (page: Page) => page.locator('[data-counter]');

test('P opens the presenter; navigation syncs both ways', async ({ context, page }) => {
  await page.goto('/index.html#/3/1');
  const presenter = await openPresenter(context, page);
  expect(presenter.url()).toContain('presenter.html?profile=full');
  await expect(counter(presenter)).toHaveText(`Slide 3 / ${FULL_COUNT}, step 1 / 4`);
  await expect(presenter.locator('[data-next-label]')).toHaveText('3 steps left on this slide');
  await expect(presenter.locator('[data-notes]')).toContainText(
    'We group wireless networks by how far they reach',
  );

  await page.keyboard.press('PageDown');
  await expect(counter(presenter)).toHaveText(`Slide 3 / ${FULL_COUNT}, step 2 / 4`);

  for (let i = 0; i < 3; i++) await presenter.keyboard.press('PageDown');
  await expect.poll(() => hash(page)).toBe('#/4');
  await expect(counter(presenter)).toHaveText(`Slide 4 / ${FULL_COUNT}, step 0 / 3`);
  await expect(presenter.locator('[data-next-label]')).toHaveText('3 steps left on this slide');

  await presenter.keyboard.press('PageUp');
  await expect.poll(() => hash(page)).toBe('#/3/4');

  // Jump from the presenter.
  await presenter.keyboard.press('1');
  await presenter.keyboard.press('Enter');
  await expect.poll(() => hash(page)).toBe('#/1');
  await expect(presenter.locator('[data-notes]')).toContainText('start from Table 1.5');
  await expect(presenter.locator('[data-notes] h3')).toHaveCount(3);

  // No click-advance in the presenter.
  await presenter.mouse.click(400, 400);
  await expect.poll(() => hash(page)).toBe('#/1');
});

test('reloading either window resyncs (the deck is authoritative)', async ({ context, page }) => {
  await page.goto('/index.html#/3/2');
  const presenter = await openPresenter(context, page);
  await presenter.reload();
  await expect(counter(presenter)).toHaveText(`Slide 3 / ${FULL_COUNT}, step 2 / 4`);

  await page.keyboard.press('End');
  await page.reload();
  await expect(counter(presenter)).toHaveText(`Slide ${FULL_COUNT} / ${FULL_COUNT}`);
  await presenter.keyboard.press('PageUp');
  await expect.poll(() => hash(page)).toBe(`#/${FULL_COUNT - 1}/5`);
});

test('B in the presenter blacks out only the audience screen', async ({ context, page }) => {
  await page.goto('/index.html#/1');
  const presenter = await openPresenter(context, page);
  await presenter.keyboard.press('b');
  await expect(page.locator('[data-blackout]')).toBeVisible();
  await expect(presenter.locator('[data-status]')).toHaveText(
    'Linked to deck, audience blacked out',
  );
  // The presenter can still move while the audience is dark.
  await presenter.keyboard.press('PageDown');
  await expect.poll(() => hash(page)).toBe('#/2');
  await presenter.keyboard.press('.');
  await expect(page.locator('[data-blackout]')).toBeHidden();
});

test('presenter timer starts, pauses, resets and survives a refresh', async ({ context, page }) => {
  await page.goto('/index.html#/1');
  const presenter = await openPresenter(context, page);
  const elapsed = presenter.locator('[data-elapsed]');
  await presenter.getByRole('button', { name: 'Start timer' }).click();
  await expect(elapsed).toHaveText('0:01', { timeout: 3000 });
  await presenter.reload();
  await expect(elapsed).not.toHaveText('0:00');
  await presenter.getByRole('button', { name: 'Pause timer' }).click();
  const paused = await elapsed.textContent();
  await presenter.waitForTimeout(1200);
  await expect(elapsed).toHaveText(paused ?? '');
  await presenter.getByRole('button', { name: 'Reset timer' }).click();
  await expect(elapsed).toHaveText('0:00');
  await expect(presenter.locator('.presenter-clock')).toHaveText(/\d{1,2}:\d{2}/);
  await expect(presenter.locator('.presenter-target')).toHaveText(
    'Target 0:20, planned by end of slide 0:20',
  );
  // References & questions is last; the plan adds up to 12:40.
  await presenter.keyboard.press('End');
  await expect(presenter.locator('.presenter-target')).toHaveText(
    'Target 0:20, planned by end of slide 12:40',
  );
});

test('profiles are kept apart: a 10min presenter follows a 10min deck', async ({
  context,
  page,
}) => {
  await page.goto('/index.html?profile=10min#/1');
  const presenter = await openPresenter(context, page);
  expect(presenter.url()).toContain('profile=10min');
  await page.keyboard.press('PageDown');
  await expect(counter(presenter)).toHaveText(`Slide 2 / ${TEN_COUNT}, step 0 / 1`);
  await expect(presenter.locator('[data-next-label]')).toHaveText('1 step left on this slide');
  await presenter.keyboard.press('End');
  await expect.poll(() => hash(page)).toBe(`#/${TEN_COUNT}`);
  // The last slide is References & questions.
  await expect(presenter.locator('[data-next-label]')).toHaveText('End of deck');
  await expect(presenter.locator('.presenter-target')).toHaveText(
    'Target 0:20, planned by end of slide 8:50',
  );
  await presenter.keyboard.press('Digit8');
  await presenter.keyboard.press('Enter');
  await expect
    .poll(() => page.locator('.stage > .slide[data-current]').getAttribute('data-id'))
    .toBe('wifi6-7-8');
});

test('single-file deck.html works from file:// with the presenter at ?role=presenter', async ({
  context,
  page,
}) => {
  const url = pathToFileURL(
    resolve(import.meta.dirname, '../../../dist-example-single/deck.html'),
  ).href;
  await page.goto(`${url}#/1`);
  await expect(page.locator('.stage > .slide[data-current]')).toHaveCount(1);
  const presenter = await openPresenter(context, page);
  expect(presenter.url()).toContain('deck.html?role=presenter&profile=full');
  await page.keyboard.press('PageDown');
  await expect(counter(presenter)).toHaveText(`Slide 2 / ${FULL_COUNT}, step 0 / 1`);
  await presenter.keyboard.press('PageDown');
  await expect.poll(() => hash(page)).toBe('#/2/1');
});

test('opener fallback: syncs both ways and survives a deck reload without BroadcastChannel', async ({
  context,
  page,
}) => {
  // Simulates Firefox on file://, where the channel does not link two different files.
  await context.addInitScript(() => {
    Reflect.deleteProperty(window, 'BroadcastChannel');
  });
  await page.goto('/index.html#/1');
  expect(await page.evaluate(() => 'BroadcastChannel' in window)).toBe(false);
  const presenter = await openPresenter(context, page);
  await page.keyboard.press('PageDown');
  await expect(counter(presenter)).toHaveText(`Slide 2 / ${FULL_COUNT}, step 0 / 1`);
  await presenter.keyboard.press('PageDown');
  await expect.poll(() => hash(page)).toBe('#/2/1');

  // The deck reloads: it has lost the popup reference, the presenter says hello until it answers.
  await page.reload();
  await page.keyboard.press('End');
  await expect(counter(presenter)).toHaveText(`Slide ${FULL_COUNT} / ${FULL_COUNT}`);
  await presenter.keyboard.press('PageUp');
  await expect.poll(() => hash(page)).toBe(`#/${FULL_COUNT - 1}/5`);
});

test('the presenter highlights the script for the current step and shows pace', async ({
  context,
  page,
}) => {
  await page.goto('/index.html#/3');
  const presenter = await openPresenter(context, page);
  const active = presenter.locator('[data-notes] [data-step][data-active]');
  await expect(active).toHaveCount(1);
  await expect(active).toHaveAttribute('data-step', '0');
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  await expect(active).toHaveAttribute('data-step', '2');
  await expect(active).toContainText('WLAN');
  await expect(presenter.locator('.presenter-pace')).toHaveText('Start the timer to see pace');
  await presenter.getByRole('button', { name: 'Start timer' }).click();
  // Slide 3 is planned to start at 1:05, so a fresh timer is ahead.
  await expect(presenter.locator('.presenter-pace')).toHaveText(/ahead$/);
  await presenter.getByRole('button', { name: 'Reset timer' }).click();
});

test('the presenter shows only the Next line for the talk being given', async ({
  context,
  page,
}) => {
  await page.goto('/index.html#/5');
  const full = await openPresenter(context, page);
  await expect(full.locator('[data-notes] [data-profile]')).toHaveCount(1);
  await expect(full.locator('[data-notes]')).toContainText(
    'So how do many devices share one channel?',
  );
  await expect(full.locator('[data-notes]')).not.toContainText('On to the generations.');
  await full.close();
  await page.goto('/index.html?profile=10min#/5');
  const ten = await openPresenter(context, page);
  await expect(ten.locator('[data-notes]')).toContainText('On to the generations.');
  await expect(ten.locator('[data-notes]')).not.toContainText(
    'So how do many devices share one channel?',
  );
});
