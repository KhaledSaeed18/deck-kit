import { test as base, expect, type Page } from '@playwright/test';

const LOCAL = /^(?:http:\/\/127\.0\.0\.1:417[35]\/|file:\/\/|data:|blob:|about:)/;

export interface Offline {
  /** Requests that tried to leave the machine (all aborted). */
  readonly blocked: string[];
  readonly consoleErrors: string[];
}

/** Blocks the network for the whole browser context and records any attempt. */
export const test = base.extend<{ guard: Offline }>({
  guard: [
    async ({ context }, use) => {
      const blocked: string[] = [];
      const consoleErrors: string[] = [];
      await context.route('**/*', (route) => {
        const url = route.request().url();
        if (LOCAL.test(url)) return route.continue();
        if (!blocked.includes(url)) blocked.push(url);
        return route.abort('internetdisconnected');
      });
      context.on('request', (request) => {
        if (!LOCAL.test(request.url()) && !blocked.includes(request.url()))
          blocked.push(request.url());
      });
      const watch = (page: Page) =>
        page.on('console', (msg) => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
      context.pages().forEach(watch);
      context.on('page', watch);
      await use({ blocked, consoleErrors });
      expect(blocked, 'network requests left the machine').toEqual([]);
      expect(consoleErrors, 'console errors').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const hash = (page: Page) => page.evaluate(() => location.hash);

/** Steps state of all fragments on the current slide. */
export const fragmentStates = (page: Page) =>
  page.$$eval('.stage > .slide[data-current] [data-fragment]', (els) =>
    els.map((el) => el.getAttribute('data-fragment-state')),
  );

export const currentSlideId = (page: Page) =>
  page.$eval('.stage > .slide[data-current]', (el) => el.getAttribute('data-id'));

/** Slide counts per profile of the example deck. References & questions is the last slide in both. */
export const FULL_COUNT = 13;
export const TEN_COUNT = 10;
