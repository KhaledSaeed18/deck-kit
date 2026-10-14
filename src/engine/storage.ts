/** Storage that never throws (file:// and private modes can block it). */

function safe(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    const storage = globalThis[kind];
    return storage ?? null;
  } catch {
    return null;
  }
}

export function readItem(kind: 'localStorage' | 'sessionStorage', key: string): string | null {
  try {
    return safe(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeItem(
  kind: 'localStorage' | 'sessionStorage',
  key: string,
  value: string | null,
): void {
  try {
    const storage = safe(kind);
    if (value === null) storage?.removeItem(key);
    else storage?.setItem(key, value);
  } catch {
    // Storage is unavailable; the setting simply does not persist.
  }
}
