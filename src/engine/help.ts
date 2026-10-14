import { helpRows } from './keymap.ts';
import type { Role } from './types.ts';

/** Help overlay (?), rendered from the keymap so it can never drift from the real bindings. */

export interface Help {
  readonly element: HTMLElement;
  readonly isOpen: boolean;
  toggle(): void;
  close(): void;
}

export function createHelp(role: Role): Help {
  const element = document.createElement('div');
  element.className = 'help';
  element.hidden = true;
  element.tabIndex = -1;
  element.setAttribute('role', 'dialog');
  element.setAttribute('aria-labelledby', `help-title-${role}`);
  element.dataset.help = '';
  element.dataset.noAdvance = '';

  const title = document.createElement('h2');
  title.className = 'help-title';
  title.id = `help-title-${role}`;
  title.textContent = 'Keyboard';

  const table = document.createElement('table');
  table.className = 'help-table';
  const body = document.createElement('tbody');
  for (const row of helpRows(role)) {
    const tr = document.createElement('tr');
    const keys = document.createElement('th');
    keys.scope = 'row';
    for (const label of row.labels) {
      const kbd = document.createElement('kbd');
      kbd.textContent = label;
      keys.append(kbd);
    }
    const description = document.createElement('td');
    description.textContent = row.description;
    tr.append(keys, description);
    body.append(tr);
  }
  table.append(body);

  const hint = document.createElement('p');
  hint.className = 'help-hint';
  hint.textContent =
    role === 'deck'
      ? 'Keys in the presenter window drive this screen too. Press ? to close.'
      : 'Keys here drive the audience screen. B blacks it out; F fullscreens this window only. Press ? to close.';

  element.append(title, table, hint);

  let open = false;
  const close = (): void => {
    if (!open) return;
    open = false;
    element.hidden = true;
    element.blur();
  };

  return {
    element,
    get isOpen() {
      return open;
    },
    toggle() {
      if (open) {
        close();
        return;
      }
      open = true;
      element.hidden = false;
      element.focus();
    },
    close,
  };
}
