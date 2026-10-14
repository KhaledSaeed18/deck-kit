import { applyStep } from './fragments.ts';
import { hydrateIcons } from './icons.ts';
import { parseFragment, rootSection } from './loader.ts';
import { bindPreviewScale } from './stage.ts';
import type { SlideModel } from './types.ts';

/**
 * Previews re-render a slide from its partial source into a scaled, inert box. Ids and id
 * references are stripped so the clone never collides with the live slide. No iframes.
 */

const ID_REFERENCES = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'for', 'headers'];

export function renderSlideClone(slide: SlideModel, step: number): HTMLElement {
  const section = rootSection(parseFragment(slide.html));
  if (!section) throw new Error(`${slide.file}: cannot render preview`);
  for (const el of [section, ...section.querySelectorAll('*')]) {
    el.removeAttribute('id');
    for (const attr of ID_REFERENCES) el.removeAttribute(attr);
  }
  section.removeAttribute('hidden');
  section.setAttribute('aria-hidden', 'true');
  section.inert = true;
  section.classList.add('is-preview');
  applyStep(section, step);
  hydrateIcons(section);
  return section;
}

export interface Preview {
  readonly element: HTMLElement;
  show(slide: SlideModel | null, step: number): void;
  destroy(): void;
}

/** A 16:9 box holding a 1920x1080 canvas scaled to the box width. */
export function createPreview(className: string): Preview {
  const element = document.createElement('div');
  element.className = `preview ${className}`;
  const canvas = document.createElement('div');
  canvas.className = 'preview-canvas';
  element.append(canvas);
  const unbind = bindPreviewScale(element);
  let shown = '';

  return {
    element,
    show(slide, step) {
      const key = slide ? `${slide.id}/${step}` : '';
      if (key === shown) return;
      shown = key;
      canvas.replaceChildren(...(slide ? [renderSlideClone(slide, step)] : []));
      element.toggleAttribute('data-empty', !slide);
    },
    destroy: unbind,
  };
}
