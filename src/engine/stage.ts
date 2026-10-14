/** Fixed 1920x1080 canvas, scaled uniformly to fit the viewport and centred (letterboxed). */

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

export function fitScale(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 1;
  return Math.min(width / CANVAS_WIDTH, height / CANVAS_HEIGHT);
}

/**
 * Top-left offset that centres the scaled canvas, rounded to whole pixels. A fractional
 * offset makes the canvas edges anti-alias against the letterbox (a hairline at the edge).
 */
export function stageOffset(
  width: number,
  height: number,
  scale: number,
): { x: number; y: number } {
  return {
    // `|| 0` turns a floating-point -0 into 0.
    x: Math.round((width - CANVAS_WIDTH * scale) / 2) || 0,
    y: Math.round((height - CANVAS_HEIGHT * scale) / 2) || 0,
  };
}

/** Keeps `--scale`, `--stage-x` and `--stage-y` on `stage` current. Returns an unbind function. */
export function bindStageScale(stage: HTMLElement, win: Window = window): () => void {
  const update = (): void => {
    const scale = fitScale(win.innerWidth, win.innerHeight);
    const { x, y } = stageOffset(win.innerWidth, win.innerHeight, scale);
    stage.style.setProperty('--scale', String(scale));
    stage.style.setProperty('--stage-x', `${x}px`);
    stage.style.setProperty('--stage-y', `${y}px`);
  };
  update();
  win.addEventListener('resize', update);
  win.document.addEventListener('fullscreenchange', update);
  return () => {
    win.removeEventListener('resize', update);
    win.document.removeEventListener('fullscreenchange', update);
  };
}

/** Keeps `--preview-scale` on a preview box current as its container resizes. */
export function bindPreviewScale(box: HTMLElement): () => void {
  const update = (): void => {
    const width = box.clientWidth;
    if (width > 0) box.style.setProperty('--preview-scale', String(width / CANVAS_WIDTH));
  };
  update();
  if (typeof ResizeObserver === 'undefined') return () => {};
  const observer = new ResizeObserver(update);
  observer.observe(box);
  return () => observer.disconnect();
}
