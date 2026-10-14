/** Accessibility helpers: the live region and hiding non-current slides. */

export function createLiveRegion(doc: Document = document): {
  element: HTMLElement;
  announce(text: string): void;
} {
  const element = doc.createElement('div');
  element.className = 'visually-hidden';
  element.setAttribute('aria-live', 'polite');
  element.setAttribute('aria-atomic', 'true');
  element.dataset.live = '';
  return {
    element,
    announce(text) {
      if (element.textContent !== text) element.textContent = text;
    },
  };
}

/**
 * Shows exactly one slide. Others are `inert` (out of the accessibility tree and focus order)
 * and hidden on screen by engine.css; print shows them all with the theme's own layout.
 */
export function showOnly(slides: readonly HTMLElement[], index: number): void {
  slides.forEach((slide, i) => {
    const current = i === index;
    slide.inert = !current;
    slide.toggleAttribute('data-current', current);
  });
}

export function slideAnnouncement(index: number, count: number, title: string): string {
  return `Slide ${index + 1} of ${count}${title ? `: ${title}` : ''}`;
}
