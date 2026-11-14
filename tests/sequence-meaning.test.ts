import { describe, expect, it } from 'vitest';
import { removeIds, renameId, setFields } from '../src/cli/edit';
import { compareDetailed } from '../src/dsl/compare';
import { checkSource } from '../src/dsl/compile';
import { projectScene, visibleRects } from '../src/dsl/project';
import { translateEdit } from '../src/dsl/translate';
import { printSource, readSource } from '../src/dsl/syntax';
import { normalize } from '../src/model/document';
import { replyTargets, setMessage } from '../src/model/edits';
import { clone } from '../src/model/geometry';
import { headOf, tailOf } from '../src/model/markers';
import { computeRoutes } from '../src/model/routes';
import { messageKey } from '../src/model/status';
import type { Diagram } from '../src/model/types';

const signIn = `diagram "Sign-in" version=1
node user "User"
node app "Web app"
node auth "Auth service"
node db "User store"
edge m1 user -> app "submit" message=interaction
edge m2 app -> auth "verify" message=call
edge m3 auth -> db "load user" message=call
edge m4 db -> auth "user record" message=reply reply-to=m3
# The auth service does this itself.
action m5 auth "check password hash"
edge m6 auth -> app "session token" message=reply reply-to=m2
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

  it.each([
    [lines('edge m a -> b message=reply kind=async'), /Remove kind=/],
    [lines('edge m a -> b message=call head=diamond'), /Remove head=/],
    [lines('edge m a -> b reply-to=n'), /Give m message=reply/],
    [lines('edge m a -> b message=reply reply-to=n'), /Unknown message n/],
    [
      lines('edge m b -> a message=reply reply-to=n', 'edge n a -> b message=call'),
      /comes after it/,
    ],
    [lines('edge n a -> b', 'edge m b -> a message=reply reply-to=n'), /has no kind/],
    [lines('action n a "work"', 'edge m b -> a message=reply reply-to=n'), /which is an action/],
    [
      lines('edge n a -> b message=call', 'edge m a -> b message=reply reply-to=n'),
      /runs back from b to a/,
    ],
    ['node a "A"\naction x a "work"', /use layout root sequence/],
    ['node a "A"\nnode b "B"\nedge m a -> b message=call', /use layout root sequence/],
    [lines('action x c "work"'), /c/],
    [lines('+action x a "work"'), /Only node, group and edge lines/],
  ])('refuses %s', (source, message) => {
    expect(() => checkSource(source)).toThrow(message);
  });

  it('takes two replies to one message, and a reply that names none', () => {
    const scene = checkSource(
      lines(
        'edge n a -> b message=send',
        'edge r1 b -> a message=reply reply-to=n',
        'edge r2 b -> a message=reply reply-to=n',
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

  it('edits actions and replies from the command line', () => {
    expect(setFields(signIn, 'action.m5', ['label=compare hashes'])).toContain(
      'action m5 auth "compare hashes"\n',
    );
    const renamed = renameId(signIn, 'm3', 'load');
    expect(renamed).toContain('reply-to=load');
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
