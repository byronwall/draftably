import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/cli/svg';
import { compareDetailed } from '../src/dsl/compare';
import { checkSource } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';
import { parseModel, printSource, readSource } from '../src/dsl/syntax';
import { translateEdit, UnsupportedEdit } from '../src/dsl/translate';
import type { Diagram } from '../src/model/types';

const TABLES = `group orgs "orgs" <<T
  id    uuid  pk
  name  text
T
layout orgs table
group users "users" <<T
  id      uuid  pk
  email   text  uk nn
+ org_id  uuid  fk -> orgs.id
  created timestamp with time zone
T
layout users table
`;

describe('database tables', () => {
  it('makes each body line a node group.name, with its type, keys and change mark', () => {
    const m = parseModel(TABLES),
      row = (id: string) => m.objects.find(o => o.id === id)!;
    expect(m.objects.filter(o => o.parent === 'users').map(o => o.id)).toEqual([
      'users.id',
      'users.email',
      'users.org_id',
      'users.created',
    ]);
    expect(row('users.email')).toMatchObject({ label: 'email', type: 'node', line: 8 });
    expect(row('users.email').row).toEqual({ type: 'text', keys: ['uk', 'nn'] });
    expect(row('users.created').row).toEqual({ type: 'timestamp with time zone', keys: [] });
    expect(row('users.org_id')).toMatchObject({
      status: 'added',
      row: { type: 'uuid', keys: ['fk'], ref: 'orgs.id' },
    });
    // The body prints back exactly as written.
    expect(printSource(readSource(TABLES))).toBe(TABLES);
  });

  it('draws -> as a many-to-one line, which a written edge between the same rows replaces', () => {
    expect(parseModel(TABLES).edges).toEqual([
      expect.objectContaining({
        id: 'users.org_id.fk',
        source: 'users.org_id',
        target: 'orgs.id',
        tail: 'many',
        head: 'one',
        status: 'added',
        inferred: true,
      }),
    ]);
    const written = parseModel(
      TABLES + 'edge member orgs.id -> users.org_id tail=one head=zero-or-many "has"',
    ).edges;
    expect(written.map(e => e.id)).toEqual(['member']);
  });

  it('reports a bad row or an unknown -> target at its own line', () => {
    const bad = (row: string) => () => parseModel(`group t "t" <<T\n  id uuid pk\n  ${row}\nT\n`);
    expect(bad('x  int  key')).toThrow(/^Line 3: Unknown key mark key on row x/);
    expect(bad('x int fk -> nope.id')).toThrow(
      /^Line 3: t\.x refers to nope\.id, which is not a node/,
    );
    expect(bad('x int -> ')).toThrow(/^Line 3: Row x ends with ->/);
    expect(bad('id text')).toThrow(/^Line 3: Duplicate node\/group id t\.id/);
    expect(bad('9x int')).toThrow(/^Line 3: A table row starts with its column name/);
    expect(bad('x int ->t.id')).toThrow(/^Line 3: Row x needs a space after ->/);
    expect(bad('x int -> t')).toThrow(
      /^Line 3: t\.x refers to t, which is not a row: it is a group/,
    );
    expect(() => parseModel(`group t "t" <<T\n  id  uuid \t pk\nT\n`)).not.toThrow();
    // The generated id `t.x.fk` must not be taken by anything else.
    expect(() =>
      parseModel(`group t "t" <<T\n  id uuid pk\n  x uuid -> t.id\nT\nnode t.x.fk "taken"\n`),
    ).toThrow(/^Line 3: t\.x draws a line to t\.id with the id t\.x\.fk/);
  });

  it('lays a table out as one column of rows with one width', () => {
    const scene = checkSource(TABLES),
      rows = ['id', 'email', 'org_id', 'created'].map(n => scene.byId.get(`users.${n}`)!);
    expect(new Set(rows.map(r => r.w)).size).toBe(1);
    expect(new Set(rows.map(r => r.x)).size).toBe(1);
    for (let i = 1; i < rows.length; i++) expect(rows[i].y).toBe(rows[i - 1].y + rows[i - 1].h);
    const svg = renderSvg(projectScene(scene));
    expect(svg).toContain('>timestamp with time zone</text>');
    expect(svg).toContain('>text uk nn</text>');
  });

  it('draws a body without a table layout as plain boxes', () => {
    const source = TABLES.replace('layout users table', 'layout users cells'),
      svg = renderSvg(projectScene(checkSource(source)));
    expect(svg).not.toContain('>text uk nn</text>');
    expect(svg).toContain('>email</tspan>');
  });

  it('compares two versions row by row inside a table body', () => {
    const older = TABLES,
      newer = TABLES.replace('  email   text  uk nn\n', '')
        .replace('+ org_id  uuid  fk -> orgs.id', '  org_id  bigint  fk -> orgs.id')
        .replace('  created timestamp', '  plan    text\n  created timestamp');
    const { merged, unshown } = compareDetailed(older.replace('+ org_id', '  org_id'), newer);
    expect(merged).toContain(
      '- email   text  uk nn\n~ org_id  bigint  fk -> orgs.id\n+ plan    text\n',
    );
    expect(unshown).toEqual(['users.org_id (type)']);
    const m = parseModel(merged);
    expect(m.objects.find(o => o.id === 'users.email')!.status).toBe('removed');
    expect(m.objects.find(o => o.id === 'users.plan')!.status).toBe('added');
  });

  it('swaps a removed written edge for the -> line it covered, and leaves code bodies as written', () => {
    const plain = TABLES.replace('+ org_id', '  org_id'),
      override = 'edge e users.org_id -> orgs.id "uses"\n',
      code = 'node q shape=code <<SQL\nconsole.log(x);\nSQL\n';
    const { merged } = compareDetailed(plain + override + code, plain);
    expect(merged).toContain('-edge e users.org_id -> orgs.id "uses"');
    expect(merged).toContain('-node q shape=code <<SQL\nconsole.log(x);\nSQL');
    const edges = parseModel(merged).edges;
    expect(edges.find(e => e.id === 'users.org_id.fk')!.status).toBe('added');
    expect(edges.find(e => e.id === 'e')!.status).toBe('removed');
  });

  it('keeps body rows and their lines read-only in the Editor, but lets the whole table go', () => {
    const scene = checkSource(TABLES),
      before = projectScene(scene);
    const run = (fn: (d: Diagram) => void) => {
      const after = structuredClone(before);
      fn(after);
      return printSource(
        translateEdit({
          source: readSource(TABLES),
          scene,
          before,
          after,
          label: 'Edit',
          selection: [],
        }).source,
      );
    };
    expect(() =>
      run(d => (d.graph.nodes.find(n => n.id === 'users.email')!.title = 'mail')),
    ).toThrow(UnsupportedEdit);
    expect(() =>
      run(d => {
        d.graph.nodes = d.graph.nodes.filter(n => n.id !== 'users.email');
      }),
    ).toThrow(/comes from the body of users/);
    expect(() =>
      run(d => {
        d.graph.edges = [];
      }),
    ).toThrow(UnsupportedEdit);
    const gone = run(d => {
      d.graph.groups = d.graph.groups.filter(g => g.id !== 'users');
      d.graph.nodes = d.graph.nodes.filter(n => n.parentId !== 'users');
      d.graph.edges = [];
    });
    expect(gone).not.toContain('group users');
    expect(gone).not.toContain('org_id');
  });

  it('draws the billing example with its inferred and written lines', () => {
    const source = readFileSync(path.join(__dirname, '../examples/billing-schema.draft'), 'utf8'),
      m = parseModel(source);
    expect(m.edges.map(e => e.id).sort()).toEqual([
      'has-lines',
      'invoices.org_id.fk',
      'lines.product_id.fk',
      'users.org_id.fk',
    ]);
  });
});
