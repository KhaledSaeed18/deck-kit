import './engine.css';
import { ICON_NAMES } from '../assets/icons.ts';
import { mountDeck } from './deck-view.ts';
import { loadSlides, resolveDeck } from './loader.ts';
import { mountPresenter } from './presenter/view.ts';
import type { DeckManifest, Role } from './types.ts';
import { formatIssues, lintDeck } from './validate.ts';

/** Single-file build: one HTML for both windows, so the presenter is `?role=presenter`. */
const SINGLE_FILE = import.meta.env.MODE.endsWith('single');

export function roleFrom(search: string, fallback: Role): Role {
  const role = new URLSearchParams(search).get('role');
  return role === 'presenter' || role === 'deck' ? role : fallback;
}

/** Dev only: shows slide-lint issues on top of the deck while authoring. */
function showLintOverlay(app: HTMLElement, partials: Record<string, string>): void {
  const sources = Object.entries(partials).map(([path, source]) => ({
    file: path.slice(path.lastIndexOf('/') + 1),
    source,
  }));
  const issues = lintDeck(sources, ICON_NAMES);
  if (issues.length === 0) return;
  console.warn(`[deck] slide lint\n${formatIssues(issues)}`);
  const overlay = document.createElement('pre');
  overlay.className = 'lint-overlay';
  overlay.dataset.noAdvance = '';
  overlay.textContent = `Slide lint (${issues.length})\n${formatIssues(issues)}`;
  overlay.title = 'Click to dismiss';
  overlay.addEventListener('click', () => overlay.remove());
  app.append(overlay);
}

export function boot(options: {
  readonly app: HTMLElement;
  readonly manifest: DeckManifest;
  readonly partials: Record<string, string>;
  readonly defaultRole: Role;
}): void {
  const { app, manifest, partials } = options;
  const params = new URLSearchParams(location.search);
  const deck = resolveDeck(manifest, loadSlides(partials), params.get('profile'));
  document.documentElement.dataset.profile = deck.profile;
  const role = roleFrom(location.search, options.defaultRole);
  if (role === 'presenter') mountPresenter(app, deck);
  else mountDeck(app, deck, SINGLE_FILE);
  if (import.meta.env.DEV) showLintOverlay(app, partials);
}
