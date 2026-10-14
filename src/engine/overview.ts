import { createPreview, type Preview } from './preview.ts';
import type { SlideModel } from './types.ts';

/**
 * Overview grid (O). Modal: arrows move the selection, Enter or a click jumps, O or Esc closes.
 * Thumbnails show each slide fully built.
 */

export interface Overview {
  readonly element: HTMLElement;
  readonly isOpen: boolean;
  open(current: number): void;
  close(): void;
  /** Handles a key while open. Returns true when consumed. */
  handleKey(key: string): boolean;
}

export function createOverview(
  slides: readonly SlideModel[],
  onJump: (index: number) => void,
): Overview {
  const element = document.createElement('div');
  element.className = 'overview';
  element.hidden = true;
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-label', 'Slide overview');
  element.dataset.overview = '';
  element.dataset.noAdvance = '';

  const grid = document.createElement('ol');
  grid.className = 'overview-grid';
  element.append(grid);

  let buttons: HTMLButtonElement[] = [];
  const previews: Preview[] = [];
  let selected = 0;
  let open = false;

  const build = (): void => {
    if (buttons.length > 0) return;
    buttons = slides.map((slide, index) => {
      const item = document.createElement('li');
      item.className = 'overview-item';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'overview-thumb';
      button.dataset.index = String(index);
      button.setAttribute('aria-label', `Slide ${index + 1}: ${slide.title}`);
      const preview = createPreview('overview-preview');
      previews.push(preview);
      const label = document.createElement('span');
      label.className = 'overview-label';
      label.textContent = `${index + 1}. ${slide.title}`;
      button.append(preview.element, label);
      button.addEventListener('click', () => {
        close();
        onJump(index);
      });
      item.append(button);
      grid.append(item);
      return button;
    });
  };

  const select = (index: number): void => {
    selected = Math.max(0, Math.min(buttons.length - 1, index));
    buttons.forEach((button, i) => {
      button.toggleAttribute('data-selected', i === selected);
    });
    buttons[selected]?.focus({ preventScroll: false });
  };

  const columns = (): number => {
    const first = buttons[0]?.parentElement;
    if (!first) return 1;
    const top = first.offsetTop;
    let n = 0;
    for (const button of buttons) {
      if (button.parentElement?.offsetTop !== top) break;
      n += 1;
    }
    return Math.max(1, n);
  };

  function close(): void {
    if (!open) return;
    open = false;
    element.hidden = true;
    document.documentElement.removeAttribute('data-overview-open');
    const active = document.activeElement;
    if (active instanceof HTMLElement && element.contains(active)) active.blur();
  }

  return {
    element,
    get isOpen() {
      return open;
    },
    open(current) {
      build();
      open = true;
      element.hidden = false;
      document.documentElement.setAttribute('data-overview-open', '');
      slides.forEach((slide, i) => {
        previews[i]?.show(slide, slide.steps);
      });
      select(current);
    },
    close,
    handleKey(key) {
      switch (key) {
        case 'ArrowRight':
          select(selected + 1);
          return true;
        case 'ArrowLeft':
          select(selected - 1);
          return true;
        case 'ArrowDown':
          select(selected + columns());
          return true;
        case 'ArrowUp':
          select(selected - columns());
          return true;
        case 'Home':
          select(0);
          return true;
        case 'End':
          select(buttons.length - 1);
          return true;
        case 'Enter': {
          const index = selected;
          close();
          onJump(index);
          return true;
        }
        default:
          return false;
      }
    },
  };
}
