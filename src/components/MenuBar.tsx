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

/** A click this soon after hover opened the menu was aimed at opening it, not at closing it. */
const HOVER_GRACE = 400;

/** Every command by name. Once one menu is open, hovering its neighbours opens them. */
export function MenuBar() {
  let hoverOpened = -Infinity;
  return (
    <nav class="menubar" aria-label="Menus">
      <For each={MENUS}>
        {([id, label]) => (
          <button
            type="button"
            class="menubar-item"
            aria-haspopup="menu"
            aria-expanded={menu()?.id === id}
            onClick={e => {
              if (performance.now() - hoverOpened > HOVER_GRACE) openMenu(id, e.currentTarget);
            }}
            onPointerEnter={e => {
              if (!barMenuOpen() || menu()?.id === id) return;
              hoverOpened = performance.now();
              openMenu(id, e.currentTarget);
            }}
          >
            {label}
          </button>
        )}
      </For>
    </nav>
  );
}
