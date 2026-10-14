import { defineConfig, devices } from '@playwright/test';

/**
 * Two suites, both against production builds with every outside request aborted and recorded
 * (the `guard` fixture fails a test if any happened):
 * - engine: the full engine contract, run against the example deck (dist-example on :4173 and
 *   dist-example-single/deck.html over file://). Independent of your slides.
 * - deck: generic checks on your own deck (dist on :4175, dist-single/deck.html): every slide
 *   renders, fits the canvas, passes axe, prints one page per slide, and runs offline.
 * Run with `pnpm test:e2e` (it builds first), or `pnpm test:engine` / `pnpm test:deck`.
 */
const viewport = { width: 1280, height: 720 };

export default defineConfig({
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { ...devices['Desktop Chrome'], viewport },
  projects: [
    {
      name: 'engine-chromium',
      testDir: 'tests/e2e/engine',
      use: { ...devices['Desktop Chrome'], viewport, baseURL: 'http://127.0.0.1:4173' },
    },
    {
      name: 'engine-webkit',
      testDir: 'tests/e2e/engine',
      use: { ...devices['Desktop Safari'], viewport, baseURL: 'http://127.0.0.1:4173' },
    },
    // Playwright's Firefox build fails to launch on some machines ("Could not find profile
    // folder"), so it is opt-in: E2E_FIREFOX=1 pnpm test:e2e
    ...(process.env.E2E_FIREFOX
      ? [
          {
            name: 'engine-firefox',
            testDir: 'tests/e2e/engine',
            use: { ...devices['Desktop Firefox'], viewport, baseURL: 'http://127.0.0.1:4173' },
          },
        ]
      : []),
    {
      name: 'deck-chromium',
      testDir: 'tests/e2e/deck',
      use: { ...devices['Desktop Chrome'], viewport, baseURL: 'http://127.0.0.1:4175' },
    },
  ],
  webServer: [
    {
      command:
        './node_modules/.bin/vite preview --mode example --host 127.0.0.1 --port 4173 --strictPort',
      gracefulShutdown: { signal: 'SIGTERM', timeout: 2000 },
      url: 'http://127.0.0.1:4173/index.html',
      reuseExistingServer: false,
    },
    {
      command: './node_modules/.bin/vite preview --host 127.0.0.1 --port 4175 --strictPort',
      gracefulShutdown: { signal: 'SIGTERM', timeout: 2000 },
      url: 'http://127.0.0.1:4175/index.html',
      reuseExistingServer: false,
    },
  ],
});
