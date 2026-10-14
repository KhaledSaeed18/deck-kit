/** Click-to-advance and touch/pen swipes, with Pointer Events. */

const NO_ADVANCE = 'a, button, input, textarea, select, summary, label, [data-no-advance]';
const SWIPE_MIN_PX = 50;
const SWIPE_RATIO = 1.5;
const SWIPE_MAX_MS = 600;

export interface PointerHandlers {
  readonly onNext: () => void;
  readonly onPrev: () => void;
  /** Click handling for overlays; return true to consume the click. */
  readonly onClick?: (target: Element) => boolean;
  /** Advance on a plain left click (off in the presenter window). */
  readonly clickAdvances: boolean;
}

function hasSelection(doc: Document): boolean {
  const selection = doc.getSelection();
  return selection !== null && !selection.isCollapsed && selection.toString().trim() !== '';
}

export type SwipeResult = 'next' | 'prev' | null;

/** Classifies a gesture. A left swipe (finger moves left) means next. */
export function classifySwipe(dx: number, dy: number, ms: number): SwipeResult {
  if (ms > SWIPE_MAX_MS || Math.abs(dx) < SWIPE_MIN_PX) return null;
  if (Math.abs(dx) < SWIPE_RATIO * Math.abs(dy)) return null;
  return dx < 0 ? 'next' : 'prev';
}

export function bindPointer(surface: HTMLElement, handlers: PointerHandlers): () => void {
  const doc = surface.ownerDocument;
  let start: { x: number; y: number; t: number; id: number } | null = null;
  let swiped = false;

  const onPointerDown = (event: PointerEvent): void => {
    // Browsers send no click after a moving touch, so a stale flag would swallow the next tap.
    swiped = false;
    if (event.pointerType === 'mouse' || !event.isPrimary) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest(NO_ADVANCE)) return;
    start = { x: event.clientX, y: event.clientY, t: event.timeStamp, id: event.pointerId };
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (!start || event.pointerId !== start.id) return;
    const result = classifySwipe(
      event.clientX - start.x,
      event.clientY - start.y,
      event.timeStamp - start.t,
    );
    start = null;
    if (result) {
      swiped = true;
      if (result === 'next') handlers.onNext();
      else handlers.onPrev();
    }
  };
  const onPointerCancel = (): void => {
    start = null;
  };
  const onClick = (event: MouseEvent): void => {
    if (swiped) {
      swiped = false;
      return;
    }
    if (event.button !== 0 || event.defaultPrevented) return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (handlers.onClick?.(target)) return;
    if (!handlers.clickAdvances || target.closest(NO_ADVANCE) || hasSelection(doc)) return;
    handlers.onNext();
  };

  surface.addEventListener('pointerdown', onPointerDown);
  surface.addEventListener('pointerup', onPointerUp);
  surface.addEventListener('pointercancel', onPointerCancel);
  surface.addEventListener('click', onClick);
  return () => {
    surface.removeEventListener('pointerdown', onPointerDown);
    surface.removeEventListener('pointerup', onPointerUp);
    surface.removeEventListener('pointercancel', onPointerCancel);
    surface.removeEventListener('click', onClick);
  };
}
