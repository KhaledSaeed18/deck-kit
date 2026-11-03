import { CANVAS_HEIGHT, CANVAS_WIDTH } from './stage.ts';

/**
 * Laser pointer (L): a dot with a short trail that replaces the cursor on the stage.
 * Positions are canvas units (0..1920, 0..1080), so the presenter window can drive the deck's
 * dot from its current-slide preview. The block under the dot (a card, row, item or figure) is
 * marked `data-laser-target` for the theme to highlight. The dot fades after a still moment.
 */

const TRAIL = 6;
/** Fraction of the gap each trail dot closes per frame: lower is a longer tail. */
const FOLLOW = 0.45;
const IDLE_MS = 2500;
const TARGETS = '.slide tr, .slide li, .slide .columns > article, .slide figure, .slide .bridge';

export interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

export interface Laser {
  readonly element: HTMLElement;
  readonly isOn: boolean;
  setOn(on: boolean): void;
  /** Moves the dot to a canvas point, or hides it for null. */
  moveTo(point: CanvasPoint | null): void;
}

export const LASER_UNSTYLED = 'This theme has no laser pointer style yet';

/** True when the theme styles the laser (it defines `--laser-size`). Unstyled themes keep the cursor. */
export function laserStyled(el: Element): boolean {
  const view = el.ownerDocument.defaultView;
  return view !== null && view.getComputedStyle(el).getPropertyValue('--laser-size').trim() !== '';
}

/** Converts a client point to canvas units for a box showing the whole canvas. */
export function toCanvasPoint(
  rect: DOMRectReadOnly,
  clientX: number,
  clientY: number,
): CanvasPoint | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = ((clientX - rect.left) / rect.width) * CANVAS_WIDTH;
  const y = ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
  if (x < 0 || y < 0 || x > CANVAS_WIDTH || y > CANVAS_HEIGHT) return null;
  return { x: Math.round(x), y: Math.round(y) };
}

function isShown(el: Element): boolean {
  return !el.closest('[data-fragment-state="hidden"]');
}

export function createLaser(stage: HTMLElement, onChange?: (on: boolean) => void): Laser {
  const doc = stage.ownerDocument;
  const element = doc.createElement('div');
  element.className = 'laser';
  element.setAttribute('aria-hidden', 'true');
  element.hidden = true;
  const dots = Array.from({ length: TRAIL + 1 }, (_, i) => {
    const dot = doc.createElement('div');
    dot.className = i === 0 ? 'laser-dot' : 'laser-trail';
    if (i > 0) dot.style.setProperty('--trail', String(i / TRAIL));
    return dot;
  });
  element.append(...dots.slice(1).reverse(), dots[0] as HTMLElement);

  let on = false;
  let target: CanvasPoint | null = null;
  const trail = dots.map(() => ({ x: 0, y: 0 }));
  let frame = 0;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let marked: Element | null = null;

  const mark = (el: Element | null): void => {
    if (el === marked) return;
    marked?.removeAttribute('data-laser-target');
    marked = el;
    marked?.setAttribute('data-laser-target', '');
  };

  const findTarget = (point: CanvasPoint): Element | null => {
    const rect = stage.getBoundingClientRect();
    const clientX = rect.left + (point.x / CANVAS_WIDTH) * rect.width;
    const clientY = rect.top + (point.y / CANVAS_HEIGHT) * rect.height;
    const hit = doc.elementFromPoint(clientX, clientY)?.closest(TARGETS) ?? null;
    return hit && stage.contains(hit) && isShown(hit) ? hit : null;
  };

  const draw = (): void => {
    frame = 0;
    if (!target) return;
    let settled = true;
    trail.forEach((p, i) => {
      const lead = i === 0 ? target : trail[i - 1];
      if (!lead) return;
      const k = i === 0 ? 1 : FOLLOW;
      p.x += (lead.x - p.x) * k;
      p.y += (lead.y - p.y) * k;
      if (Math.abs(lead.x - p.x) > 0.5 || Math.abs(lead.y - p.y) > 0.5) settled = false;
      dots[i]?.style.setProperty('--x', String(p.x));
      dots[i]?.style.setProperty('--y', String(p.y));
    });
    if (!settled) frame = requestAnimationFrame(draw);
  };

  const hide = (): void => {
    element.toggleAttribute('data-visible', false);
    mark(null);
  };

  const moveTo = (point: CanvasPoint | null): void => {
    if (!on) return;
    clearTimeout(idleTimer);
    if (!point) {
      target = null;
      hide();
      return;
    }
    // Appearing after a pause: start the trail at the dot instead of sweeping in.
    if (!element.hasAttribute('data-visible')) for (const p of trail) Object.assign(p, point);
    target = point;
    element.toggleAttribute('data-visible', true);
    mark(findTarget(point));
    if (!frame) frame = requestAnimationFrame(draw);
    idleTimer = setTimeout(hide, IDLE_MS);
  };

  const setOn = (value: boolean): void => {
    if (value === on) return;
    on = value;
    element.hidden = !on;
    doc.documentElement.toggleAttribute('data-laser', on);
    if (!on) {
      clearTimeout(idleTimer);
      target = null;
      hide();
    }
    onChange?.(on);
  };

  return {
    element,
    get isOn() {
      return on;
    },
    setOn,
    moveTo,
  };
}

/** Feeds mouse and pen movement over `surface` into `move`, in the canvas units of `box`. */
export function bindLaserInput(
  surface: HTMLElement,
  box: HTMLElement,
  isOn: () => boolean,
  move: (point: CanvasPoint | null) => void,
): () => void {
  let pending: CanvasPoint | null | undefined;
  let frame = 0;
  const flush = (): void => {
    frame = 0;
    if (pending !== undefined) move(pending);
    pending = undefined;
  };
  const queue = (point: CanvasPoint | null): void => {
    pending = point;
    if (!frame) frame = requestAnimationFrame(flush);
  };
  const onMove = (event: PointerEvent): void => {
    if (!isOn() || event.pointerType === 'touch') return;
    queue(toCanvasPoint(box.getBoundingClientRect(), event.clientX, event.clientY));
  };
  const onLeave = (): void => {
    if (isOn()) queue(null);
  };
  surface.addEventListener('pointermove', onMove);
  surface.addEventListener('pointerleave', onLeave);
  return () => {
    surface.removeEventListener('pointermove', onMove);
    surface.removeEventListener('pointerleave', onLeave);
  };
}

/** Hides the system cursor after a still moment (`data-cursor-idle` on the root). */
export function bindCursorIdle(doc: Document = document): () => void {
  const root = doc.documentElement;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    root.removeAttribute('data-cursor-idle');
    clearTimeout(timer);
    timer = setTimeout(() => root.setAttribute('data-cursor-idle', ''), IDLE_MS);
  };
  doc.addEventListener('pointermove', onMove);
  return () => {
    clearTimeout(timer);
    doc.removeEventListener('pointermove', onMove);
  };
}
