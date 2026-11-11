/**
 * The anchor layer both handles share: one stable target element per anchored item, above the
 * drawing. `body:<id>` targets sit in world space in one transformed layer, so they scale and clip
 * with the node; `overlay:<id>` targets sit in screen space at the item's on-screen box. A target
 * keeps its identity while its item exists, across updates and camera moves. The layer itself is
 * never detached while the handle lives.
 */
import type { Diagnostic } from './types';
import { itemBox, type Box, type Geometry } from './geometry';

/** A slot name. IDs come from source text, so the type cannot check them; diagnostics do. */
export type DraftSlot = `body:${string}` | `overlay:${string}`;
export type AnchorKind = 'node' | 'group' | 'edge';

export interface Anchor {
  slot: DraftSlot;
  id: string;
  kind: AnchorKind;
  /** The stable target. */
  el: HTMLElement;
}

/** Below this zoom, bodies hide and titles show again (`detail: 'auto'`). */
export const LOW_DETAIL_ZOOM = 0.4;

type Target = { el: HTMLElement; id: string; kind: AnchorKind; body: boolean; box: Box };

export interface AnchorLayer {
  readonly el: HTMLElement;
  /** The slots the host wants. Returns true when the targets changed. */
  setSlots(slots: readonly string[]): boolean;
  /** Whether the host wants any slot. */
  hasSlots(): boolean;
  /** A new committed drawing. Returns true when the targets changed. */
  setGeometry(geometry: Geometry | null): boolean;
  /** The camera: screen = origin + world × zoom. Writes only; reads no layout. */
  place(originX: number, originY: number, zoom: number): void;
  anchors(): Anchor[];
  /** IDs of nodes whose body is anchored, for hiding their titles. */
  bodyIds(): string[];
  /** Slot warnings: unknown IDs and content that overflows its box. */
  warnings(): Diagnostic[];
  /** The target holding `node`, if any. */
  idOf(node: Node): string | undefined;
  destroy(): void;
}

const kindIn = (g: Geometry, id: string): AnchorKind | undefined =>
  g.nodes[id] ? 'node' : g.groups[id] ? 'group' : g.edges[id] ? 'edge' : undefined;

const warn = (code: string, message: string, id: string): Diagnostic => ({
  code,
  severity: 'warning',
  message,
  itemIds: [id],
});

export function createAnchorLayer(
  doc: Document,
  options: { detail?: 'auto' | 'full'; onOverflow?: () => void } = {},
): AnchorLayer {
  const layer = doc.createElement('div'),
    bodies = doc.createElement('div'),
    overlays = doc.createElement('div');
  layer.className = 'draft-anchors';
  bodies.className = 'draft-anchors__bodies';
  overlays.className = 'draft-anchors__overlays';
  layer.append(bodies, overlays);
  layer.dataset.draftDetail = 'full';

  const targets = new Map<string, Target>();
  let wanted: string[] = [];
  let geometry: Geometry | null = null;
  /** A drawing has committed: before that, no slot is unknown yet. */
  let committed = false;
  let unknown: string[] = [];
  let zoom = 1;
  const overflowing = new Set<string>();
  const win = doc.defaultView;
  const sizes = win?.ResizeObserver
    ? new win.ResizeObserver(() => {
        // Content larger than its box: the host draws more than the room the source declares.
        let changed = false;
        for (const [slot, t] of targets) {
          if (!t.body) continue;
          const content = contentOf(t.el),
            over = content.some(
              c => c.offsetWidth > t.box.width + 0.5 || c.offsetHeight > t.box.height + 0.5,
            );
          if (over !== overflowing.has(slot)) {
            changed = true;
            if (over) overflowing.add(slot);
            else overflowing.delete(slot);
          }
        }
        if (changed) options.onOverflow?.();
      })
    : undefined;

  /** What a target shows: a slot's assigned elements, or its own children. */
  function contentOf(el: HTMLElement): HTMLElement[] {
    const first = el.firstElementChild;
    if (first instanceof HTMLSlotElement)
      return first.assignedElements().filter((e): e is HTMLElement => e instanceof HTMLElement);
    return [...el.children].filter((e): e is HTMLElement => e instanceof HTMLElement);
  }

  function reconcile(): boolean {
    let changed = false;
    const keep = new Set<string>();
    unknown = [];
    /** Drawing order, so Tab moves through targets as a reader sees the items. */
    let rank: Map<string, number> | undefined;
    const rankOf = (id: string) => {
      rank ??= new Map(
        [geometry!.nodes, geometry!.groups, geometry!.edges]
          .flatMap(Object.keys)
          .map((k, i) => [k, i]),
      );
      return rank.get(id) ?? Infinity;
    };
    for (const slot of wanted) {
      const colon = slot.indexOf(':'),
        part = slot.slice(0, colon),
        id = slot.slice(colon + 1);
      const kind = geometry ? kindIn(geometry, id) : undefined;
      // Bodies fill nodes only: a group's box holds its members.
      if (!geometry || !kind || (part === 'body' && kind !== 'node') || keep.has(slot)) {
        if (committed && !keep.has(slot)) unknown.push(slot);
        continue;
      }
      keep.add(slot);
      const box = itemBox(geometry, id)!;
      let t = targets.get(slot);
      if (!t || t.kind !== kind) {
        if (t) t.el.remove();
        const el = doc.createElement('div');
        el.className = `draft-anchor draft-anchor--${part}`;
        el.dataset.draftAnchor = slot;
        t = { el, id, kind, body: part === 'body', box };
        targets.set(slot, t);
        // A new target goes in drawing order; a target that exists never moves, so focus in its
        // content survives.
        const parent = t.body ? bodies : overlays,
          at = rankOf(id);
        let next: Element | null = null;
        for (const c of parent.children) {
          const s = (c as HTMLElement).dataset.draftAnchor!;
          if (rankOf(s.slice(s.indexOf(':') + 1)) > at) {
            next = c;
            break;
          }
        }
        parent.insertBefore(el, next);
        changed = true;
      }
      t.box = box;
      if (t.body) {
        const s = t.el.style;
        s.left = `${box.x}px`;
        s.top = `${box.y}px`;
        s.width = `${box.width}px`;
        s.height = `${box.height}px`;
      }
    }
    for (const [slot, t] of targets) {
      if (keep.has(slot)) continue;
      const focused = doc.activeElement,
        hadFocus = !!focused && contentOf(t.el).some(c => c.contains(focused));
      t.el.remove();
      targets.delete(slot);
      overflowing.delete(slot);
      changed = true;
      // Focus inside a removed item goes back to the drawing.
      if (hadFocus) layer.dispatchEvent(new CustomEvent('draft-anchor-focus-lost'));
    }
    if (sizes) {
      sizes.disconnect();
      for (const t of targets.values())
        if (t.body) for (const c of contentOf(t.el)) sizes.observe(c);
    }
    return changed;
  }

  return {
    el: layer,
    setSlots(slots) {
      wanted = [...new Set(slots)];
      return reconcile();
    },
    hasSlots: () => wanted.length > 0,
    setGeometry(next) {
      geometry = next;
      committed = true;
      return reconcile();
    },
    place(originX, originY, k) {
      // A changed custom property restyles every target: write it only when the zoom changes.
      if (k !== zoom || !layer.style.getPropertyValue('--draft-zoom'))
        layer.style.setProperty('--draft-zoom', String(k));
      zoom = k;
      bodies.style.transform = `translate(${originX}px, ${originY}px) scale(${k})`;
      for (const t of targets.values()) {
        if (t.body) continue;
        const s = t.el.style;
        s.transform = `translate(${originX + t.box.x * k}px, ${originY + t.box.y * k}px)`;
        s.width = `${t.box.width * k}px`;
        s.height = `${t.box.height * k}px`;
      }
      const low = options.detail !== 'full' && k < LOW_DETAIL_ZOOM;
      if ((layer.dataset.draftDetail === 'low') !== low) {
        layer.dataset.draftDetail = low ? 'low' : 'full';
        bodies.inert = low;
      }
    },
    anchors: () =>
      [...targets].map(([slot, t]) => ({
        slot: slot as DraftSlot,
        id: t.id,
        kind: t.kind,
        el: t.el,
      })),
    bodyIds: () =>
      zoom < LOW_DETAIL_ZOOM && options.detail !== 'full'
        ? []
        : [...targets.values()].filter(t => t.body).map(t => t.id),
    warnings: () => [
      ...unknown.map(slot =>
        warn(
          'DRAFT_SLOT_UNKNOWN',
          geometry
            ? `Slot ${slot} names no item that can hold it. A body fills a node; an overlay covers a node, group or edge.`
            : `Slot ${slot} shows nothing: this drawing repeats items (compare or states), so slots are off.`,
          slot.slice(slot.indexOf(':') + 1),
        ),
      ),
      ...[...overflowing].map(slot =>
        warn(
          'DRAFT_SLOT_OVERFLOW',
          `The content of ${slot} is larger than its node. Declare the room with size … min-height=.`,
          slot.slice(slot.indexOf(':') + 1),
        ),
      ),
    ],
    idOf(node) {
      for (const t of targets.values())
        if (t.el.contains(node) || contentOf(t.el).some(c => c.contains(node))) return t.id;
      return undefined;
    },
    destroy() {
      sizes?.disconnect();
      targets.clear();
      layer.remove();
    },
  };
}
