import { countSteps } from './fragments.ts';
import type { DeckManifest, DeckModel, SlideModel } from './types.ts';

/** Parses an HTML string into a detached fragment (no scripts run, nothing is fetched). */
export function parseFragment(html: string, doc: Document = document): DocumentFragment {
  const template = doc.createElement('template');
  template.innerHTML = html;
  return template.content;
}

/** The single root `section.slide` of a partial, or null. */
export function rootSection(fragment: DocumentFragment): HTMLElement | null {
  const elements = Array.from(fragment.children);
  const [first] = elements;
  if (elements.length !== 1 || !first || !first.matches('section.slide')) return null;
  return first as HTMLElement;
}

export function slideTitle(section: Element): string {
  const heading = section.querySelector(
    ':scope > h1, :scope > h2, :scope > header h1, :scope > header h2',
  );
  return (heading?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** Turns one partial into a SlideModel, moving `aside.notes` out of the markup. */
export function loadSlide(file: string, source: string, doc: Document = document): SlideModel {
  const section = rootSection(parseFragment(source, doc));
  if (!section) throw new Error(`${file}: expected exactly one root <section class="slide">`);
  const notes = section.querySelectorAll(':scope > aside.notes');
  const notesHtml = Array.from(notes, (aside) => aside.innerHTML.trim()).join('\n');
  for (const aside of notes) aside.remove();
  return {
    id: section.dataset.id ?? '',
    type: section.dataset.type ?? '',
    title: slideTitle(section),
    html: section.outerHTML,
    notesHtml,
    steps: countSteps(section),
    file,
  };
}

/** File name without directories, e.g. `./slides/01-title.html` becomes `01-title.html`. */
export function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/** Loads every partial, sorted by file name. */
export function loadSlides(
  modules: Record<string, string>,
  doc: Document = document,
): SlideModel[] {
  return Object.entries(modules)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, source]) => loadSlide(baseName(path), source, doc));
}

/** Resolves the active profile. Unknown profile names fall back to the default profile. */
export function resolveDeck(
  manifest: DeckManifest,
  slides: readonly SlideModel[],
  requested: string | null,
): DeckModel {
  const profile = requested && requested in manifest.profiles ? requested : manifest.defaultProfile;
  const entries = manifest.profiles[profile];
  if (!entries) throw new Error(`deck manifest has no profile "${profile}"`);
  const byId = new Map(slides.map((slide) => [slide.id, slide]));
  return {
    id: manifest.id,
    title: manifest.title,
    profile,
    slides: entries.map((entry) => {
      const slide = byId.get(entry.id);
      if (!slide) throw new Error(`profile "${profile}" lists unknown slide "${entry.id}"`);
      return { ...slide, targetSeconds: entry.targetSeconds, backup: entry.backup === true };
    }),
  };
}
