import { describe, expect, it } from 'vitest';
import { removeIds, renameId, setFields } from '../src/cli/edit';
import { compareDetailed } from '../src/dsl/compare';
import { checkSource } from '../src/dsl/compile';
import { activationSpans } from '../src/dsl/sequence-layout';
import { projectScene, visibleRects } from '../src/dsl/project';
import { translateEdit } from '../src/dsl/translate';
import { printSource, readSource } from '../src/dsl/syntax';
import { normalize } from '../src/model/document';
import { replyTargets, setMessage, setReplyTo } from '../src/model/edits';
import { clone } from '../src/model/geometry';
import { headOf, tailOf } from '../src/model/markers';
import { computeRoutes } from '../src/model/routes';
import { drawnLegend, messageKey, sequenceDescription } from '../src/model/status';
import { renderSvg } from '../src/runtime/svg-renderer';
import type { Diagram } from '../src/model/types';

const signIn = `diagram "Sign-in" version=1
node user "User"
node app "Web app"
node auth "Auth service"
node db "User store"
edge m1 user -> app "submit" message=interaction
edge m2 app -> auth "verify" message=call
edge m3 auth -> db "load user" message=call
edge m4 db -> auth "user record" answers=m3
# The auth service does this itself.
action m5 auth "check password hash"
edge m6 auth -> app "session token" answers=m2
edge m7 app -> user "signed in" message=outcome
phase verify "Verify" m3 m4 m5
layout root sequence
`;

const lines = (...edges: string[]) =>
  ['node a "A"', 'node b "B"', ...edges, 'layout root sequence'].join('\n');

describe('kinds of sequence message', () => {
  it('keeps an action in its place among the messages, on its own participant', () => {
    const scene = checkSource(signIn),
      doc = projectScene(scene),
      rows = scene.edges.map(e => e.row!);
    expect(scene.objects.filter(o => o.type === 'node')).toHaveLength(4);
    expect(scene.edges.map(e => e.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7']);
    rows.slice(1).forEach((r, i) => expect(r).toBeGreaterThan(rows[i]));
    const m5 = doc.graph.edges.find(e => e.id === 'm5')!;
    expect(m5).toMatchObject({ from: 'auth', to: 'auth', message: 'action' });
    expect(doc.graph.edges.find(e => e.id === 'm4')).toMatchObject({
      message: 'reply',
      replyTo: 'm3',
      dashed: true,
    });
    // Normalizing a saved document keeps every meaning.
    expect(normalize(JSON.parse(JSON.stringify(doc))).graph.edges).toEqual(doc.graph.edges);
  });

  it('draws an action as a box that clears both neighbours and the rows round it', () => {
    const doc = projectScene(checkSource(signIn)),
      { vg, rects } = visibleRects(doc),
      routes = new Map(computeRoutes(doc, vg, rects).routes.map(r => [r.id, r])),
      mid = (id: string) => rects.get(id)!.x + rects.get(id)!.w / 2,
      box = routes.get('m5')!.points,
      xs = box.map(p => p.x),
      ys = box.map(p => p.y);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBe(mid('auth'));
    expect(Math.min(...xs) - mid('app')).toBeGreaterThanOrEqual(8);
    expect(mid('db') - Math.max(...xs)).toBeGreaterThanOrEqual(8);
    expect(Math.min(...ys)).toBeGreaterThan(doc.layout.edges.m4.row!);
    const next = routes.get('m6')!.label!;
    expect(next.y - next.h / 2).toBeGreaterThan(Math.max(...ys));
    // The label sits inside the box.
    const label = routes.get('m5')!.label!;
    expect(label.x).toBe(mid('auth'));
    expect(label.w).toBeLessThan(Math.max(...xs) - Math.min(...xs));
    const edge = doc.graph.edges.find(e => e.id === 'm5')!;
    expect([headOf(edge), tailOf(edge)]).toEqual(['none', 'none']);
  });

  it('keeps an action on the first and the last lane inside the panel', () => {
    const scene = checkSource(
        lines('action x a "a long action on the first lane"', 'action y b "one on the last lane"'),
      ),
      doc = projectScene(scene),
      { vg, rects } = visibleRects(doc),
      { panel } = scene.sequence!;
    for (const r of computeRoutes(doc, vg, rects).routes)
      for (const p of r.points) {
        expect(p.x).toBeGreaterThanOrEqual(panel.x + 20);
        expect(p.x).toBeLessThanOrEqual(panel.x + panel.w - 20);
      }
  });

  it('draws a key row for each mark in use, and none for a plain sequence', () => {
    expect(messageKey(projectScene(checkSource(signIn))).map(e => e.label)).toEqual([
      'message / result shown',
      'call: the sender waits',
      'reply',
      'local action',
    ]);
    expect(messageKey(projectScene(checkSource(lines('edge m a -> b kind=async'))))).toEqual([]);
  });

  it('describes the exchange in words, in order, in the exported SVG', () => {
    const doc = projectScene(checkSource(signIn));
    expect(sequenceDescription(doc)).toBe(
      'Sequence between User, Web app, Auth service, User store, in order from top to bottom. ' +
        '1. User to Web app: submit. ' +
        '2. Web app to Auth service: verify (call: the sender waits). ' +
        '3. Auth service to User store: load user (call: the sender waits). ' +
        '4. User store to Auth service: user record (reply to step 3). ' +
        '5. Auth service does: check password hash. ' +
        '6. Auth service to Web app: session token (reply to step 2). ' +
        '7. Web app to User: signed in (result shown).',
    );
    expect(renderSvg(doc)).toContain('<desc id="draft-description">Sequence between User,');
    expect(renderSvg(doc, { description: 'Mine' })).toContain('>Mine</desc>');
    expect(sequenceDescription(projectScene(checkSource('node a "A"')))).toBeUndefined();
  });

  it.each([
    [lines('edge m a -> b message=reply kind=async'), /Remove kind=/],
    [lines('edge m a -> b message=call head=diamond'), /Remove head=/],
    [lines('edge m a -> b answers=n'), /Unknown message n/],
    [
      lines('edge n a -> b message=call', 'edge m b -> a message=send answers=n'),
      /message=send and answers=, which disagree/,
    ],
    [lines('edge n a -> b message=call', 'edge m b -> a answers=n kind=async'), /Remove kind=/],
    [lines('edge m a -> b message=reply answers=n'), /Unknown message n/],
    [
      lines('edge m b -> a message=reply answers=n', 'edge n a -> b message=call'),
      /comes after it/,
    ],
    [lines('edge n a -> b', 'edge m b -> a message=reply answers=n'), /has no kind/],
    [lines('action n a "work"', 'edge m b -> a message=reply answers=n'), /which is an action/],
    [
      lines('edge n a -> b message=call', 'edge m a -> b message=reply answers=n'),
      /runs back from b to a/,
    ],
    ['node a "A"\naction x a "work"', /use layout root sequence/],
    ['node a "A"\nnode b "B"\nedge m a -> b message=call', /use layout root sequence/],
    [lines('action x c "work"'), /c/],
    [lines('+action x a "work"'), /Only node, group and edge lines/],
  ])('refuses %s', (source, message) => {
    expect(() => checkSource(source)).toThrow(message);
  });

  it('reads answers= alone as a reply, the same as the long form', () => {
    const short = lines('edge n a -> b "ask" message=call', 'edge m b -> a "tell" answers=n'),
      long = short.replace('answers=n', 'message=reply answers=n'),
      [a, b] = [short, long].map(src => projectScene(checkSource(src)));
    expect(a.graph.edges[1]).toMatchObject({ message: 'reply', replyTo: 'n', dashed: true });
    expect(a.graph.edges).toEqual(b.graph.edges);
    expect(renderSvg(a)).toBe(renderSvg(b));
  });

  it('takes two replies to one message, and a reply that names none', () => {
    const scene = checkSource(
      lines(
        'edge n a -> b message=send',
        'edge r1 b -> a message=reply answers=n',
        'edge r2 b -> a message=reply answers=n',
        'edge r3 b -> a message=reply',
      ),
    );
    expect(scene.edges.map(e => e.replyTo)).toEqual([undefined, 'n', 'n', undefined]);
  });

  it('warns when kind=async sits beside messages that have a kind', () => {
    const mixed = checkSource(lines('edge m a -> b message=call', 'edge n b -> a kind=async'));
    expect(mixed.diagnostics.map(d => d.code)).toContain('message-kind');
    const plain = checkSource(lines('edge m a -> b', 'edge n b -> a kind=async'));
    expect(plain.diagnostics.map(d => d.code)).not.toContain('message-kind');
  });
});

describe('edits to kinds of message', () => {
  const edit = (fn: (d: Diagram) => void) => {
    const scene = checkSource(signIn),
      before = projectScene(scene),
      after = clone(before);
    fn(after);
    return printSource(
      translateEdit({
        source: readSource(signIn),
        scene,
        before: normalize(JSON.parse(JSON.stringify(before))),
        after: normalize(JSON.parse(JSON.stringify(after))),
        label: 'Edit',
        selection: [],
      }).source,
    );
  };
  const edge = (d: Diagram, id: string) => d.graph.edges.find(e => e.id === id)!;

  it('keeps the kind and the reply when a label changes', () => {
    expect(
      edit(d => {
        edge(d, 'm4').label = 'the user record';
        edge(d, 'm5').label = 'compare hashes';
      }),
    ).toBe(
      signIn
        .replace('"user record"', '"the user record"')
        .replace('"check password hash"', '"compare hashes"'),
    );
  });

  it('deletes an action from its phase, and unpairs a reply whose message goes', () => {
    const out = edit(d => {
      d.graph.edges = d.graph.edges.filter(e => !['m5', 'm3'].includes(e.id));
    });
    expect(out).toContain('phase verify "Verify" m4\n');
    expect(out).toContain('edge m4 db -> auth "user record" message=reply\n');
    expect(out).not.toContain('action m5');
    expect(out).toContain('# The auth service does this itself.');
    expect(() => checkSource(out)).not.toThrow();
  });

  it("turns a self-message into an action and back, on the author's word", () => {
    const selfed = signIn.replace(
      'action m5 auth "check password hash"',
      'edge m5 auth -> auth "check password hash"',
    );
    expect(edit(d => setMessage(d, 'm5', undefined))).toBe(selfed);
    const scene = checkSource(selfed),
      before = projectScene(scene),
      after = clone(before);
    setMessage(after, 'm5', 'action');
    const back = translateEdit({
      source: readSource(selfed),
      scene,
      before,
      after,
      label: 'Edit',
      selection: [],
    });
    expect(printSource(back.source)).toBe(signIn);
  });

  it('sets a kind in place of a style, and unpairs replies that lose their message', () => {
    const out = edit(d => {
      setMessage(d, 'm3', 'outcome');
      setMessage(d, 'm1', undefined);
    });
    expect(out).toContain('edge m1 user -> app "submit"\n');
    expect(out).toContain('edge m3 auth -> db "load user" message=outcome\n');
    expect(out).toContain('edge m4 db -> auth "user record" message=reply\n');
    const doc = projectScene(checkSource(signIn));
    expect(replyTargets(doc, 'm6').map(e => e.id)).toEqual(['m2']);
    expect(replyTargets(doc, 'm7').map(e => e.id)).toEqual(['m1']);
  });

  it('writes a reply that names its message in the short form, and keeps one that names none', () => {
    const long = signIn.replace(
      '"user record" answers=m3',
      '"user record" message=reply answers=m3',
    );
    const scene = checkSource(long),
      before = projectScene(scene),
      run = (fn: (d: Diagram) => void) => {
        const after = clone(before);
        fn(after);
        return printSource(
          translateEdit({
            source: readSource(long),
            scene,
            before,
            after,
            label: 'Edit',
            selection: [],
          }).source,
        );
      };
    // An edit to the long form writes the short one.
    expect(run(d => void (edge(d, 'm4').label = 'the record'))).toContain(
      'edge m4 db -> auth "the record" answers=m3\n',
    );
    // Clearing Reply to keeps the reply; a new target drops message= again.
    expect(run(d => setReplyTo(d, 'm6', undefined))).toContain(
      'edge m6 auth -> app "session token" message=reply\n',
    );
    // Another kind takes answers= away.
    expect(run(d => setMessage(d, 'm6', 'outcome'))).toContain(
      'edge m6 auth -> app "session token" message=outcome\n',
    );
    expect(setFields(signIn, 'm4', ['answers='])).toContain(
      'edge m4 db -> auth "user record" message=reply\n',
    );
  });

  it('edits actions and replies from the command line', () => {
    expect(setFields(signIn, 'action.m5', ['label=compare hashes'])).toContain(
      'action m5 auth "compare hashes"\n',
    );
    const renamed = renameId(signIn, 'm3', 'load');
    expect(renamed).toContain('answers=load');
    expect(renamed).toContain('phase verify "Verify" load m4 m5');
    expect(removeIds(signIn, ['action.m5'])).toContain('phase verify "Verify" m3 m4\n');
    // A participant takes its actions and messages with it.
    const out = removeIds(signIn, ['auth']);
    expect(out).not.toContain('action m5');
    expect(out).not.toContain('phase verify');
  });

  it('refuses to compare versions that use kinds of message', () => {
    const plain = lines('edge m a -> b "go"');
    expect(() => compareDetailed(plain, lines('edge m a -> b "go" message=call'))).toThrow(
      /can't show kinds of message or actions yet/,
    );
    expect(() => compareDetailed(lines('action x a "work"'), plain)).toThrow(/actions yet/);
    expect(() => compareDetailed(plain, lines('edge m a -> b "went"'))).not.toThrow();
  });
});

describe('activation bars', () => {
  const ev = (id: string, source: string, target: string, message?: string, replyTo?: string) => ({
    id,
    source,
    target,
    ...(message ? { message } : {}),
    ...(replyTo ? { replyTo } : {}),
  });

  it('opens a bar at a call and closes it at the last reply that answers the call', () => {
    expect(
      activationSpans([
        ev('m1', 'a', 'b', 'call'),
        ev('m2', 'b', 'a', 'reply', 'm1'),
        ev('m3', 'b', 'a', 'reply', 'm1'),
        ev('m4', 'a', 'b', 'send'),
        ev('m5', 'a', 'b'),
      ]),
    ).toEqual([{ lane: 'b', call: 'm1', start: 0, end: 2, level: 0 }]);
  });

  it('steps a bar out when its participant takes a call while another bar is open', () => {
    const spans = activationSpans([
      ev('m1', 'a', 'b', 'call'),
      ev('m2', 'b', 'c', 'call'),
      ev('m3', 'c', 'b', 'call'),
      ev('m4', 'b', 'c', 'reply', 'm3'),
      ev('m5', 'c', 'b', 'reply', 'm2'),
      ev('m6', 'c', 'b', 'call'),
      ev('m7', 'b', 'c', 'reply', 'm6'),
      ev('m8', 'b', 'a', 'reply', 'm1'),
    ]);
    expect(spans.map(s => [s.call, s.lane, s.start, s.end, s.level])).toEqual([
      ['m1', 'b', 0, 7, 0],
      ['m2', 'c', 1, 4, 0],
      ['m3', 'b', 2, 3, 1],
      // The first nested bar closed at m4, so the next one takes its level again.
      ['m6', 'b', 5, 6, 1],
    ]);
  });

  it("ends a call with no reply at its participant's next message, or as a stub", () => {
    expect(
      activationSpans([
        ev('m1', 'a', 'b', 'call'),
        ev('x', 'b', 'b', 'action'),
        ev('m2', 'b', 'c', 'call'),
        ev('m3', 'a', 'a', 'call'),
      ]),
    ).toEqual([
      { lane: 'b', call: 'm1', start: 0, end: 2, level: 0 },
      // Nothing answers m2 and c sends nothing, so its bar is a stub. A call to itself has none.
      { lane: 'c', call: 'm2', start: 2, level: 0 },
    ]);
  });

  const source = (layout: string) => `node a "A"
node b "B"
node c "C"
edge m1 a -> b "ask" message=call
action x b "work"
edge m2 b -> c "ask again" message=call
edge m3 c -> c "think"
edge m4 c -> b "answer" answers=m2
edge m5 b -> a "answer" message=reply answers=m1
${layout}
`;

  it('draws no bar, and moves nothing, until the layout line turns bars on', () => {
    const off = checkSource(source('layout root sequence')),
      explicit = checkSource(source('layout root sequence activations=off'));
    expect(off.sequence!.activations).toBeUndefined();
    expect(renderSvg(projectScene(explicit))).toBe(renderSvg(projectScene(off)));
    expect(drawnLegend(projectScene(off)).map(e => e.label)).not.toContain('at work on a call');
  });

  it('ends each message on the side of a bar, and keeps labels and loops clear of it', () => {
    const scene = checkSource(source('layout root sequence activations=on')),
      doc = projectScene(scene),
      { vg, rects } = visibleRects(doc),
      routes = new Map(computeRoutes(doc, vg, rects).routes.map(r => [r.id, r])),
      mid = (id: string) => rects.get(id)!.x + rects.get(id)!.w / 2,
      row = (id: string) => doc.layout.edges[id].row!,
      bars = doc.layout.sequence!.activations!;
    expect(bars.map(b => [b.node, b.call])).toEqual([
      ['b', 'm1'],
      ['c', 'm2'],
    ]);
    const [b, c] = bars;
    // Each bar is centred on its lifeline and runs a little past its call and its reply.
    expect([b.x + b.w / 2, c.x + c.w / 2]).toEqual([mid('b'), mid('c')]);
    expect([b.y, b.y + b.h]).toEqual([row('m1') - 4, row('m5') + 4]);
    expect([c.y, c.y + c.h]).toEqual([row('m2') - 4, row('m4') + 4]);
    // The call arrives on the bar's left side; the reply leaves from it.
    expect(routes.get('m1')!.points).toEqual([
      { x: mid('a'), y: row('m1') },
      { x: b.x, y: row('m1') },
    ]);
    expect(routes.get('m2')!.points[0].x).toBe(b.x + b.w);
    expect(routes.get('m5')!.points[0].x).toBe(b.x);
    // A self-message inside a bar starts on the bar's right side.
    expect(routes.get('m3')!.points[0].x).toBe(c.x + c.w);
    // No label touches a bar.
    for (const r of routes.values())
      if (r.label && r.id !== 'x')
        for (const bar of bars) {
          const l = r.label,
            apart =
              l.x + l.w / 2 <= bar.x ||
              l.x - l.w / 2 >= bar.x + bar.w ||
              l.y + l.h / 2 <= bar.y ||
              l.y - l.h / 2 >= bar.y + bar.h;
          expect(apart, `${r.id} label and the bar of ${bar.call}`).toBe(true);
        }
    // An action sits on its participant's bar, and the key names the bar.
    expect(routes.get('x')!.label!.x).toBe(mid('b'));
    expect(drawnLegend(doc).map(e => e.label)).toContain('at work on a call');
    expect(normalize(JSON.parse(JSON.stringify(doc))).layout.sequence!.activations).toEqual(bars);
  });

  it('refuses the switch on another recipe with a warning, not an error', () => {
    const scene = checkSource('node a "A"\nlayout root flow activations=on');
    expect(scene.model.warnings.map(w => w.code)).toContain('layout-attribute');
  });
});
