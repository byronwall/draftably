import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { printSource, readSource } from '../src/dsl/syntax';
import {
  movedOutsideEdit,
  reflowGroup,
  translateEdit,
  UnsupportedEdit,
} from '../src/dsl/translate';
import * as edits from '../src/model/edits';
import { clone } from '../src/model/geometry';
import type { Diagram } from '../src/model/types';

const checkout = readFileSync(path.join(__dirname, '../examples/checkout.meld'), 'utf8');

/** Apply an editor edit to the projected file and return the new source and its scene. */
function edit(source: string, label: string, selection: string[], fn: (d: Diagram) => void) {
  const scene = compile(source),
    before = projectScene(scene),
    after = clone(before);
  fn(after);
  const result = translateEdit({
    source: readSource(source),
    scene,
    before,
    after,
    label,
    selection,
  });
  const text = printSource(result.source);
  return { text, scene: compile(text), result };
}

describe('translating editor edits', () => {
  it('saves a drag as a relative preference next to the nearest sibling', () => {
    const { text, scene, result } = edit(checkout, 'Move objects', ['db'], d => {
      const api = d.layout.nodes.platform;
      d.layout.nodes.db.x = api.x + api.w + 40;
      d.layout.nodes.db.y = api.y + 200;
    });
    expect(text).toMatch(/^near db platform side=right gap=40 offset=\d+$/m);
    expect(result.notes[0]).toBe('db right of platform');
    const platform = scene.byId.get('platform')!,
      db = scene.byId.get('db')!;
    expect(db.x).toBe(platform.x + platform.w + 40);
  });

  it('keeps comments and unrelated statements when saving', () => {
    const { text } = edit(checkout, 'Move objects', ['db'], d => {
      d.layout.nodes.db.y += 300;
    });
    expect(text).toContain('# Customer-facing entry points.');
    expect(text).toContain('node payments "Payments" in=services shape=pill # charges cards');
    expect(text).toContain('# Layout refinements');
  });

  it('pins at the parent-local position and releases to a soft anchor', () => {
    const pinned = edit(checkout, 'Pin objects', ['orders'], d => {
      d.layout.nodes.orders.pinned = true;
    });
    const orders = compile(checkout).byId.get('orders')!;
    expect(pinned.text).toContain(`pin orders x=${orders.localX} y=${orders.localY}`);
    const released = edit(pinned.text, 'Unpin objects', ['orders'], d => {
      d.layout.nodes.orders.pinned = false;
    });
    expect(released.text).not.toMatch(/^pin orders/m);
    expect(released.text).toContain(`stay orders x=${orders.localX} y=${orders.localY}`);
  });

  it('writes requested sizes for shapes and containers', () => {
    const node = edit(checkout, 'Resize shape', ['api'], d => {
      d.layout.nodes.api.w = 240;
    });
    expect(node.text).toContain('size api width=240 height=56');
    const group = edit(checkout, 'Resize container', ['services'], d => {
      d.layout.nodes.services.x -= 3; // grid snapping
      d.layout.nodes.services.w += 100;
      d.layout.nodes.services.h += 60;
    });
    const before = compile(checkout).byId.get('services')!;
    expect(group.text).toContain(
      `layout services row gap=56 min-width=${before.w + 100} min-height=${before.h + 60}`,
    );
    expect(group.scene.byId.get('services')!.w).toBe(before.w + 100);
    expect(group.text).not.toMatch(/^near services/m);
  });

  it('adds, renames, connects, styles and deletes with readable ids', () => {
    const { text, result } = edit(checkout, 'Add shape', [], d => {
      const id = edits.addNode(
        d,
        { title: 'Fraud check', parentId: 'services' },
        { x: 900, y: 600 },
      );
      edits.addEdge(d, { from: 'payments', to: id, label: 'score' });
      edits.setTitle(d, 'api', 'Gateway');
      edits.setStyle(d, 'db', { color: 'rose', shape: 'diamond' });
      edits.deleteObjects(d, ['web']);
    });
    expect(text).toMatch(/^node fraud-check "Fraud check" in=services$/m);
    expect(text).toMatch(/^edge payments-fraud-check payments -> fraud-check "score"$/m);
    expect(text).toContain('node api "Gateway" in=platform');
    expect(text).toContain('node db "Postgres" color=rose shape=diamond');
    expect(text).not.toMatch(/web/);
    expect([...result.ids.values()]).toEqual(['fraud-check', 'payments-fraud-check']);
  });

  it('wraps objects in a new group and ungroups them', () => {
    const wrapped = edit(checkout, 'Create container', [], d => {
      edits.wrapInContainer(d, ['db'], { x: 0, y: 0 });
    });
    expect(wrapped.text).toMatch(/^group container "Container"$/m);
    expect(wrapped.text).toContain('node db "Postgres" color=violet in=container');
    const flat = edit(wrapped.text, 'Ungroup', [], d => edits.ungroup(d, ['container']));
    expect(flat.text).not.toMatch(/container/);
  });

  it('reverses and restyles connections', () => {
    const { text } = edit(checkout, 'Reverse connection', [], d => {
      edits.reverseEdge(d, 'charge');
      d.graph.edges.find(e => e.id === 'persist')!.dashed = false;
    });
    expect(text).toContain('edge charge payments -> orders "authorize"');
    expect(text).toContain('edge persist orders -> db "persist"\n');
  });

  it('rejects edits the file cannot express', () => {
    expect(() =>
      edit(checkout, 'Add waypoint', [], d => edits.addWaypoint(d, 'charge', { x: 10, y: 10 })),
    ).toThrow(UnsupportedEdit);
  });

  it('does not write geometry for objects that were not edited', () => {
    const { text } = edit(checkout, 'Move objects', ['db'], d => {
      d.layout.nodes.web.x += 50; // a side effect, not the selection
    });
    expect(text).toBe(printSource(readSource(checkout)));
  });
});

describe('stability after a refinement', () => {
  const drag = () =>
    edit(checkout, 'Move objects', ['payments'], d => {
      const orders = d.layout.nodes.orders;
      d.layout.nodes.payments.x = orders.x;
      d.layout.nodes.payments.y = orders.y + orders.h + 40;
    });

  it('anchors top-level objects and siblings around the edit', () => {
    const { text, result } = drag();
    expect(text).toMatch(/^near payments orders side=below gap=40$/m);
    for (const id of ['clients', 'platform', 'db', 'api', 'orders'])
      expect(text).toMatch(new RegExp(`^stay ${id} x=\\d+ y=\\d+$`, 'm'));
    expect(text).not.toMatch(/^stay (web|mobile)/m);
    expect(result.notes.at(-1)).toBe('anchored 6 nearby');
  });

  it('keeps distant regions steady and reports movement the growth forces', () => {
    const { text } = drag();
    const before = compile(text);
    const added =
      text +
      'node fraud "Fraud check" in=services\nedge score payments -> fraud "score"\nnode cache "Cache"\nedge lookup api -> cache\n';
    const after = compile(added);
    for (const id of ['clients', 'web', 'mobile'])
      expect([after.byId.get(id)!.x, after.byId.get(id)!.y]).toEqual([
        before.byId.get(id)!.x,
        before.byId.get(id)!.y,
      ]);
    // The refinement still holds inside the edited group.
    const orders = after.byId.get('orders')!,
      payments = after.byId.get('payments')!;
    expect(payments.y).toBe(orders.y + orders.h + 40);
    // The wider platform now overlaps db; both anchors give way, and that is reported.
    const relaxed = after.diagnostics.filter(d => d.code === 'relaxed').map(d => d.ids[0]);
    expect(relaxed.sort()).toEqual(['db', 'platform']);
    expect(movedOutsideEdit(before, after, readSource(text), readSource(added)).sort()).toEqual([
      'db',
      'platform',
    ]);
  });

  it('reports objects that moved although the edit did not mention them', () => {
    const before = compile(checkout),
      added = checkout + 'node cdn "CDN"\nedge serve cdn -> web\n',
      after = compile(added);
    const moved = movedOutsideEdit(before, after, readSource(checkout), readSource(added));
    expect(moved).toContain('clients');
    expect(moved).not.toContain('web');
    expect(moved).not.toContain('cdn');
  });

  it('reflows a group without disturbing what is around it', () => {
    const { text } = drag();
    const doc = readSource(text);
    expect(reflowGroup(doc, compile(text), 'services')).toBe(2);
    const reflowed = printSource(doc);
    expect(reflowed).not.toMatch(/^near payments/m);
    expect(reflowed).not.toMatch(/^stay orders/m);
    expect(reflowed).toMatch(/^stay platform/m);
  });
});
