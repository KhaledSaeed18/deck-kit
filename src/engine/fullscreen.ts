/**
 * Fullscreen toggle. State is read only from `fullscreenchange`: Esc exits fullscreen without
 * the page seeing the key in Chrome, so nothing may depend on an Esc keydown.
 * Must be called from a key or click handler (it needs user activation).
 */

export function fullscreenSupported(doc: Document = document): boolean {
  return doc.fullscreenEnabled === true;
}

export async function toggleFullscreen(doc: Document = document): Promise<void> {
  try {
    if (doc.fullscreenElement) await doc.exitFullscreen();
    else if (fullscreenSupported(doc)) await doc.documentElement.requestFullscreen();
  } catch (error) {
    console.warn('[deck] fullscreen request failed', error);
  }
}

/** Mirrors fullscreen state onto `data-fullscreen` on the root element. */
export function bindFullscreenState(doc: Document = document): () => void {
  const update = (): void => {
    doc.documentElement.toggleAttribute('data-fullscreen', doc.fullscreenElement !== null);
  };
  update();
  doc.addEventListener('fullscreenchange', update);
  return () => doc.removeEventListener('fullscreenchange', update);
}
