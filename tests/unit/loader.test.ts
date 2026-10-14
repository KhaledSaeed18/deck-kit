import { describe, expect, it } from 'vitest';
import { loadSlide, loadSlides, resolveDeck } from '../../src/engine/loader.ts';
import { renderSlideClone } from '../../src/engine/preview.ts';
import type { DeckManifest } from '../../src/engine/types.ts';

const source = `<section class="slide" data-type="statement" data-id="one" aria-labelledby="one-h">
  <h2 id="one-h">One <em>slide</em></h2>
  <p data-fragment="1">x</p><p data-fragment="2">y</p>
  <aside class="notes"><h3>Say</h3><ul><li>note</li></ul></aside>
</section>`;

describe('loader', () => {
  it('moves notes out of the slide markup', () => {
    const slide = loadSlide('01-one.html', source);
    expect(slide).toMatchObject({ id: 'one', type: 'statement', title: 'One slide', steps: 2 });
    expect(slide.html).not.toContain('notes');
    expect(slide.notesHtml).toContain('<li>note</li>');
  });

  it('sorts partials by file name', () => {
    const two = source.replace(/one/g, 'two');
    const slides = loadSlides({ './slides/10-two.html': two, './slides/02-one.html': source });
    expect(slides.map((s) => s.id)).toEqual(['one', 'two']);
  });

  it('resolves profiles and falls back to the default', () => {
    const slides = loadSlides({ './a.html': source, './b.html': source.replace(/one/g, 'two') });
    const manifest: DeckManifest = {
      id: 'd',
      title: 'D',
      defaultProfile: 'full',
      profiles: {
        full: [
          { id: 'one', targetSeconds: 5 },
          { id: 'two', targetSeconds: 6 },
        ],
        short: [{ id: 'two', targetSeconds: 3 }],
      },
    };
    expect(resolveDeck(manifest, slides, 'short').slides.map((s) => s.id)).toEqual(['two']);
    const fallback = resolveDeck(manifest, slides, 'nope');
    expect(fallback.profile).toBe('full');
    expect(fallback.slides[1]?.targetSeconds).toBe(6);
  });

  it('renders previews inert with ids stripped', () => {
    const clone = renderSlideClone(loadSlide('a.html', source), 1);
    expect(clone.querySelector('[id]')).toBeNull();
    expect(clone.hasAttribute('aria-labelledby')).toBe(false);
    expect(clone.inert).toBe(true);
    expect(clone.querySelectorAll('[data-fragment-state="current"]').length).toBe(1);
  });
});
