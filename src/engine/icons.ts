import { createElement } from 'lucide';
import { ICONS, isIconName } from '../assets/icons.ts';

/** Builds one icon. Size and stroke come from theme tokens through the `icon` class. */
export function iconElement(name: string): SVGElement | null {
  if (!isIconName(name)) return null;
  const svg = createElement(ICONS[name], { class: `icon icon-${name}` });
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  return svg;
}

/** Replaces every `<i data-icon="name">` under `root` with its lucide SVG. */
export function hydrateIcons(root: ParentNode): void {
  for (const placeholder of root.querySelectorAll<HTMLElement>('i[data-icon]')) {
    const name = placeholder.dataset.icon ?? '';
    const svg = iconElement(name);
    if (!svg) {
      console.warn(`[deck] unknown icon "${name}"`);
      continue;
    }
    const label = placeholder.getAttribute('aria-label');
    if (label) {
      svg.removeAttribute('aria-hidden');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', label);
    }
    placeholder.replaceWith(svg);
  }
}
