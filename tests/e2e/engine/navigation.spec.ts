import {
  currentSlideId,
  expect,
  FULL_COUNT,
  fragmentStates,
  hash,
  TEN_COUNT,
  test,
} from './fixtures.ts';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/index.html#/1');
  await expect(page.locator('.stage > .slide[data-current]')).toHaveCount(1);
});

test('clicker PageDown / PageUp walk fragments, then slides', async ({ page }) => {
  await page.goto('/index.html#/6/4');
  await page.keyboard.press('PageDown');
  expect(await hash(page)).toBe('#/7');
  expect(await currentSlideId(page)).toBe('generations');
  expect(await fragmentStates(page)).toEqual(Array(9).fill('hidden'));
  // Step 1 reveals the four early generations together.
  await page.keyboard.press('PageDown');
  expect(await hash(page)).toBe('#/7/1');
  expect(await fragmentStates(page)).toEqual([
    ...Array(4).fill('current'),
    ...Array(5).fill('hidden'),
  ]);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  expect(await hash(page)).toBe('#/7/3');
  expect(await fragmentStates(page)).toEqual([
    ...Array(5).fill('visible'),
    'current',
    ...Array(3).fill('hidden'),
  ]);
  for (let i = 0; i < 3; i++) await page.keyboard.press('PageDown');
  expect(await hash(page)).toBe('#/7/6');
  await page.keyboard.press('PageDown');
  expect(await currentSlideId(page)).toBe('faster');
  await page.keyboard.press('PageUp');
  expect(await hash(page)).toBe('#/7/6');
  await page.keyboard.press('PageUp');
  expect(await fragmentStates(page)).toEqual([...Array(7).fill('visible'), 'current', 'hidden']);
  // Hidden rows keep their box: the table does not reflow.
  const rows = page.locator('.stage > .slide[data-current] tbody tr');
  await expect(rows.nth(8)).toHaveCSS('visibility', 'hidden');
  await expect(rows.nth(7)).toHaveCSS('visibility', 'visible');
});

test('arrows, Space, Enter, Backspace, Home and End', async ({ page }) => {
  for (const key of ['ArrowRight', 'ArrowDown', 'Space', 'Enter']) await page.keyboard.press(key);
  expect(await hash(page)).toBe('#/3/1');
  for (const key of ['ArrowLeft', 'ArrowUp', 'Backspace']) await page.keyboard.press(key);
  expect(await hash(page)).toBe('#/2');
  await page.keyboard.press('End');
  expect(await hash(page)).toBe(`#/${FULL_COUNT}`);
  await page.keyboard.press('Home');
  expect(await hash(page)).toBe('#/1');
});

test('digit jump: digits then Enter, G chip, invalid numbers flash', async ({ page }) => {
  await page.keyboard.press('3');
  await expect(page.locator('[data-jump]')).toHaveText('Go to slide 3');
  await page.keyboard.press('Enter');
  expect(await hash(page)).toBe('#/3');
  await page.keyboard.press('g');
  await expect(page.locator('[data-jump]')).toHaveText('Go to slide _');
  await page.keyboard.press('9');
  await page.keyboard.press('9');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-jump]')).toHaveText('No slide 99');
  expect(await hash(page)).toBe('#/3');
  await page.keyboard.press('Numpad2');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('1');
  await page.keyboard.press('Enter');
  expect(await hash(page)).toBe('#/1');
});

test('letters work on other layouts (matched by physical key)', async ({ page }) => {
  // Arabic layout: the O key prints "خ".
  await page.evaluate(() =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'خ', code: 'KeyO', bubbles: true })),
  );
  await expect(page.locator('[data-overview]')).toBeVisible();
});

test('modifier shortcuts pass through to the browser', async ({ page }) => {
  const prevented = await page.evaluate(() => {
    const e = new KeyboardEvent('keydown', {
      key: 'p',
      code: 'KeyP',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(prevented).toBe(false);
  expect(page.context().pages()).toHaveLength(1);
});

test('click advances, links and selections do not', async ({ page }) => {
  await page.mouse.click(640, 360);
  expect(await hash(page)).toBe('#/2');
  // The slides carry no on-screen links, so inject one (and a no-advance block) for the test.
  await page.evaluate(() => {
    const slide = document.querySelector('.stage > .slide[data-current]');
    slide?.insertAdjacentHTML(
      'beforeend',
      '<a id="probe-link" href="#/1">back to start</a><p id="probe-block" data-no-advance>stay</p>',
    );
  });
  await page.locator('#probe-block').click();
  expect(await hash(page)).toBe('#/2');
  await page.locator('#probe-link').click();
  expect(await hash(page)).toBe('#/1');
});

test('overview: O opens, arrows select, Enter jumps, O closes', async ({ page }) => {
  await page.keyboard.press('o');
  const overview = page.locator('[data-overview]');
  await expect(overview).toBeVisible();
  await expect(overview.locator('.overview-thumb')).toHaveCount(FULL_COUNT);
  // Thumbnails are inert, id-free clones.
  expect(await overview.locator('[id]').count()).toBe(0);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(overview).toBeHidden();
  expect(await hash(page)).toBe('#/3');
  await page.keyboard.press('o');
  await page.keyboard.press('PageDown'); // clicker moves the selection, not the deck
  expect(await hash(page)).toBe('#/3');
  await page.keyboard.press('o');
  await expect(overview).toBeHidden();
  await page.keyboard.press('o');
  await overview.locator('.overview-thumb').first().click();
  expect(await hash(page)).toBe('#/1');
});

test('blackout: B or . blacks out, navigation is ignored, a click resumes', async ({ page }) => {
  const blackout = page.locator('[data-blackout]');
  await page.keyboard.press('b');
  await expect(blackout).toBeVisible();
  await page.keyboard.press('PageDown');
  expect(await hash(page)).toBe('#/1');
  await page.keyboard.press('b');
  await expect(blackout).toBeHidden();
  await page.keyboard.press('.');
  await expect(blackout).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(blackout).toBeHidden();
  expect(await hash(page)).toBe('#/1');
});

test('help overlay is rendered from the keymap', async ({ page }) => {
  await page.keyboard.press('Shift+Slash');
  const help = page.locator('[data-help]');
  await expect(help).toBeVisible();
  await expect(help.getByRole('row')).toHaveCount(12);
  await expect(help).toContainText('Black out the audience screen');
  await page.keyboard.press('Shift+Slash');
  await expect(help).toBeHidden();
});

test('H hides the chrome and the choice survives a reload', async ({ page }) => {
  const counter = page.locator('[data-counter]');
  await expect(counter).toHaveText(`1 / ${FULL_COUNT}`);
  await page.keyboard.press('h');
  await expect(counter).toBeHidden();
  await page.reload();
  await expect(counter).toBeHidden();
  await page.keyboard.press('h');
  await expect(counter).toBeVisible();
});

test('profiles: ?profile=10min uses its own slide list', async ({ page }) => {
  await page.goto('/index.html?profile=10min#/8');
  expect(await currentSlideId(page)).toBe('wifi6-7-8');
  await expect(page.locator('[data-counter]')).toHaveText(`8 / ${TEN_COUNT}`);
  await page.goto('/index.html?profile=unknown');
  await expect(page.locator('[data-counter]')).toHaveText(`1 / ${FULL_COUNT}`);
});

test('stage scales uniformly and letterboxes', async ({ page }) => {
  const box = () => page.locator('.stage').boundingBox();
  expect(await box()).toMatchObject({ x: 0, y: 0, width: 1280, height: 720 });
  await page.setViewportSize({ width: 1000, height: 1000 });
  await expect.poll(async () => (await box())?.width).toBeCloseTo(1000, 0);
  const b = await box();
  expect(b?.width).toBeCloseTo(1000, 0);
  expect(b?.height).toBeCloseTo(562.5, 0);
  expect(b?.y).toBeCloseTo(218.75, 0);
});

test('accessibility: one visible slide, live region, inert hidden slides', async ({ page }) => {
  await page.keyboard.press('PageDown');
  await expect(page.locator('[data-live]')).toHaveText(
    `Slide 2 of ${FULL_COUNT}: Table 1.5, Lecture 1`,
  );
  const hidden = page.locator('.stage > .slide:not([data-current])');
  await expect(hidden).toHaveCount(FULL_COUNT - 1);
  for (const el of await hidden.all()) {
    await expect(el).toBeHidden();
    expect(await el.evaluate((n) => (n as HTMLElement).inert)).toBe(true);
  }
  await page.goto('/index.html#/3/4');
  await expect(page.getByRole('img', { name: /^Coverage classes by reach/ })).toBeVisible();
  await expect(page.locator('.stage > .slide[data-current] h2')).toHaveText(
    'Classifying wireless networks by coverage',
  );
  // Icons are hydrated lucide SVGs, hidden from readers.
  await page.goto('/index.html#/6/4');
  const icons = page.locator('.stage > .slide[data-current] svg.icon');
  expect(await icons.count()).toBe(3);
  await expect(icons.first()).toHaveAttribute('aria-hidden', 'true');
  expect(await page.locator('i[data-icon]').count()).toBe(0);
});

test('reduced motion zeroes the durations', async ({ page }) => {
  const dur = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--dur-step').trim(),
    );
  // The minifier may rewrite 150ms as .15s and 0ms as 0s.
  expect(Number.parseFloat(await dur())).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(Number.parseFloat(await dur())).toBe(0);
});

test('fullscreen toggles with F, state read from fullscreenchange', async ({ page }) => {
  await page.keyboard.press('f');
  await expect(page.locator('html')).toHaveAttribute('data-fullscreen', '');
  await page.keyboard.press('f');
  await expect(page.locator('html')).not.toHaveAttribute('data-fullscreen', '');
});

test('on screen, every slide fills the stage exactly (no letterbox inside the canvas)', async ({
  page,
}) => {
  for (const [profile, count] of [
    ['full', FULL_COUNT],
    ['10min', TEN_COUNT],
  ] as const) {
    for (let n = 1; n <= count; n++) {
      await page.goto(`/index.html?profile=${profile}#/${n}`);
      const boxes = await page.evaluate(() => {
        const stage = document.querySelector('.stage')?.getBoundingClientRect();
        const slide = document
          .querySelector('.stage > .slide[data-current]')
          ?.getBoundingClientRect();
        return { stage, slide };
      });
      expect(boxes.slide, `${profile} slide ${n}`).toEqual(boxes.stage);
    }
  }
});
