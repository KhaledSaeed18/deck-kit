/**
 * Print support. CSS does the work (`@media print` in engine.css shows every slide with all
 * fragments). The events only add `data-printing` so script-driven state (timers, overlays)
 * can be paused, and remove it afterwards.
 */

export function bindPrint(onBefore: () => void, win: Window = window): () => void {
  const root = win.document.documentElement;
  const before = (): void => {
    onBefore();
    root.setAttribute('data-printing', '');
  };
  const after = (): void => root.removeAttribute('data-printing');
  win.addEventListener('beforeprint', before);
  win.addEventListener('afterprint', after);
  return () => {
    win.removeEventListener('beforeprint', before);
    win.removeEventListener('afterprint', after);
  };
}
