import { For } from 'solid-js';
import { menu, openMenu, type MenuId } from '../state/ui';

const MENUS: [MenuId, string][] = [
  ['file', 'File'],
  ['edit', 'Edit'],
  ['view', 'View'],
  ['layout', 'Layout'],
  ['help', 'Help'],
];

/** The bar's own menu is open, so moving to a neighbour switches without another click. */
const barMenuOpen = () => {
  const anchor = menu()?.anchor;
  return anchor instanceof HTMLElement && !!anchor.closest('.menubar');
};

/** Every command by name. Once one menu is open, hovering its neighbours opens them. */
export function MenuBar() {
  return (
    <nav class="menubar" aria-label="Menus">
      <For each={MENUS}>
        {([id, label]) => (
          <button
            type="button"
            class="menubar-item"
            aria-haspopup="menu"
            aria-expanded={menu()?.id === id}
            onClick={e => openMenu(id, e.currentTarget)}
            onPointerEnter={e => {
              if (barMenuOpen() && menu()?.id !== id) openMenu(id, e.currentTarget);
            }}
          >
            {label}
          </button>
        )}
      </For>
    </nav>
  );
}
