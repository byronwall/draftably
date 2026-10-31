import assert from 'node:assert/strict';
import test from 'node:test';
import { importDot } from './dot-importer.js';
import { Ids, blankPlan, finish } from './import-core.js';

test('DOT: nested clusters, implicit endpoints, repeated edges, scopes and hex appearance', () => {
  const source = [
    'digraph Pipeline {',
    '  rankdir=LR;',
    '  node [shape=box];',
    '  subgraph cluster_backend {',
    '    label="Backend";',
    '    api [label="API",style=filled,fillcolor="#dbeafe",color="#2563eb",fontcolor="#172033"];',
    '    subgraph cluster_data { label="Data"; db [label="Store",shape=circle]; }',
    '  }',
    '  user -> api [label="request"];',
    '  api -> db [label="read"];',
    '  api -> db [label="write",style=dashed];',
    '}',
  ].join('\n');
  const result = importDot(source);
  assert.equal(result.status, 'ready');
  const facts = result.facts!;
  assert.deepEqual(facts.objects.map(o => [o.id, o.kind, o.parent ?? null]), [
    ['cluster_backend', 'group', null], ['cluster_data', 'group', 'cluster_backend'],
    ['api', 'node', 'cluster_backend'], ['db', 'node', 'cluster_data'], ['user', 'node', null],
  ]);
  assert.deepEqual(facts.edges.map(e => [e.from, e.to, e.label, !!e.dashed]), [
    ['user', 'api', 'request', false], ['api', 'db', 'read', false], ['api', 'db', 'write', true],
  ]);
  assert.equal(facts.colors[0].fill, '#dbeafe');
  assert.match(result.nativeSource!, /theme-color import_1/);
  assert.deepEqual(facts.layouts, [
    { scope: 'root', kind: 'flow', direction: 'right' },
    { scope: 'cluster_backend', kind: 'flow', direction: 'right' },
    { scope: 'cluster_data', kind: 'flow', direction: 'right' },
  ]);
});

test('DOT: node defaults apply at creation, later explicit attrs merge, scopes do not leak', () => {
  const result = importDot('digraph{node[shape=box];a;node[label="New"];a;b;subgraph s{node[label="Local"];c} d;a[label="Explicit"]}');
  assert.equal(result.status, 'ready');
  assert.deepEqual(result.facts!.objects.map(o => [o.id, o.label]), [['a', 'Explicit'], ['b', 'New'], ['c', 'Local'], ['d', 'New']]);
  assert.equal(result.facts!.objects.filter(o => o.kind === 'group').length, 0);
});

test('DOT: strict repeats update one edge, retain earlier default/port values', () => {
  const result = importDot('strict digraph{node[shape=box];edge[style=dashed];a:e->b:w[label="one"];edge[style=solid];a->b[label="two"]}');
  assert.equal(result.facts!.edges.length, 1);
  assert.deepEqual(result.facts!.edges.map(e => [e.label,e.dashed,e.fromSide,e.toSide]), [['two', true, 'right','left']]);
});

test('DOT: non-strict parallel edges and self-loop keep distinct identities', () => {
  const result = importDot('digraph{node[shape=box];a->b[label="x"];a->b[label="x"];b->b[label="again"]}');
  assert.equal(result.facts!.edges.length, 3);
  assert.equal(new Set(result.facts!.edges.map(e => e.id)).size, 3);
  assert.equal(result.facts!.edges[2].from, result.facts!.edges[2].to);
});

test('DOT: brace endpoint sets expand the Cartesian product and chains in order', () => {
  const result = importDot('digraph{node[shape=box];{a b}->{c d}->e[label="send"]}');
  assert.deepEqual(result.facts!.edges.map(e => [e.from,e.to]), [['a','c'],['a','d'],['b','c'],['b','d'],['c','e'],['d','e']]);
});

test('DOT: undirected strict reverse repeats remain one undirected edge and require native patch', () => {
  const result = importDot('strict graph{node[shape=box];a--b[label="old"];b--a[label="new"]}');
  assert.equal(result.status, 'ready');
  assert.equal(result.facts!.edges.length, 1);
  assert.equal(result.facts!.edges[0].directed, false);
  assert.equal(result.facts!.edges[0].label, 'new');
  assert.deepEqual(result.requires, ['IMP-02-native-undirected']);
  assert.match(result.nativeSource!, /directed=false/);
});

test('DOT: quoted IDs, reserved IDs, object/edge collisions, escapes stay deterministic', () => {
  const source = 'digraph{node[shape=box];"root" [label="line\\nnext"]; "a b"->"a_u20_b"; edge_1->"root"; "__proto__"->"constructor"}';
  const a = importDot(source), b = importDot(source);
  assert.equal(a.status, 'ready');
  assert.equal(a.nativeSource, b.nativeSource);
  assert.equal(a.facts!.objects.find(o => o.id === 'node_root')!.label, 'line\nnext');
  assert.equal(new Set([...a.facts!.objects, ...a.facts!.edges].map(x => x.id)).size, a.facts!.objects.length + a.facts!.edges.length);
  assert(!a.facts!.objects.some(o => ['root', '__proto__', 'constructor'].includes(o.id)));
});

test('DOT: malformed, multiple graphs and parser silent-misparse profile fail atomically', () => {
  for (const [source, code] of [
    ['digraph { a -> }', 'DOT_PARSE_REJECTED'],
    ['digraph{a} digraph{b}', 'DOT_PARSE_REJECTED'],
    ['digraph{a -> subgraph s{b;c}}', 'DOT_PARSER_DIALECT'],
    ['digraph{a[label="A"][shape=box]}', 'DOT_PARSE_REJECTED'],
    ['digraph{a[label="A"+"B"]}', 'DOT_PARSE_REJECTED'],
    ['graph{a->b}', 'DOT_PARSE_REJECTED'],
  ]) {
    const r = importDot(source);
    assert.equal(r.status, 'failed', source);
    assert.equal(r.nativeSource, undefined);
    assert(r.diagnostics.some(d => d.code === code), source);
  }
});

test('DOT: semantic losses are blockers, not a successful partial graph', () => {
  for (const source of [
    'digraph{a[label=<<B>A</B>>]}',
    'digraph{a[shape=record,label="<p> x|y"];a:p->b}',
    'digraph{a->b[dir=both]}',
    'digraph{a->b[dir=back]}',
    'digraph{a->b[dir=none]}',
    'digraph{a->b[headlabel="many"]}',
    'digraph{subgraph cluster_x{a} subgraph cluster_y{a}}',
  ]) {
    const r = importDot(source);
    assert.equal(r.status, 'failed', source);
    assert.equal(r.nativeSource, undefined);
  }
});

test('DOT: unsupported appearance, resources and reversed layout require review', () => {
  const result = importDot('digraph{rankdir=RL;a[shape=cylinder,image="https://invalid.example/a.svg"];a->b[color="#ff0000"]}');
  assert.equal(result.status, 'needs-review');
  assert(result.diagnostics.some(d => d.code === 'DOT_RESOURCE_OMITTED'));
  assert(result.diagnostics.some(d => d.code === 'DOT_LAYOUT_DIRECTION'));
  assert.equal(result.facts!.edges[0].from, 'a');
  assert(!result.nativeSource!.includes('https:'));
});

test('DOT: input and expansion budgets fail before accepting an output', () => {
  assert.equal(importDot('x'.repeat(256 * 1024 + 1)).status, 'failed');
  const a = Array.from({length: 36}, (_, i) => 'a' + i).join(' ');
  const b = Array.from({length: 36}, (_, i) => 'b' + i).join(' ');
  const r = importDot('digraph{{' + a + '}->{' + b + '}}');
  assert(r.diagnostics.some(d => d.code === 'DOT_EXPANSION_LIMIT'));
  assert.equal(r.nativeSource, undefined);
});

test('native guard refuses ancestor edges and impossible containment', () => {
  const plan = blankPlan('invalid');
  plan.objects.push({id:'g',kind:'group',label:'G'}, {id:'a',kind:'node',label:'A',parent:'g'});
  plan.edges.push({id:'e',from:'g',to:'a',label:'bad',directed:true});
  const r = finish('dot','graph',plan,[],new Ids());
  assert.equal(r.status, 'failed');
  assert(r.diagnostics.some(d => d.code === 'IMPORT_ANCESTOR_EDGE'));
});

test('DOT: brace operands are unique node sets and member ports are not edge ports', () => {
  const repeated = importDot('digraph{node[shape=box];{a a}->{b b}}');
  assert.equal(repeated.facts!.edges.length, 1);
  const ports = importDot('digraph{node[shape=box];{a:n a:s b:e}->c}');
  assert.deepEqual(ports.facts!.edges.map(e => [e.from, e.to, e.fromSide]),
    [['a', 'c', undefined], ['b', 'c', undefined]]);
});

test('DOT: endpoint ports override defaults/previous values, then explicit attrs win', () => {
  for (const source of [
    'digraph{node[shape=box];edge[headport=n];a->b:s}',
    'strict digraph{node[shape=box];a->b[headport=n];a->b:s}',
    'strict graph{node[shape=box];a:e--b:w[headport=n];b:s--a:n}',
  ]) {
    const result = importDot(source);
    assert.equal(result.status, 'ready', source);
    assert.equal(result.facts!.edges.length, 1);
    assert.equal(result.facts!.edges[0].toSide, 'bottom');
  }
  const explicit = importDot('digraph{node[shape=box];edge[headport=n];a->b:s[headport=w]}');
  assert.equal(explicit.facts!.edges[0].toSide, 'left');
});

test('DOT: cluster=true on non-prefix or anonymous scopes fails instead of flattening', () => {
  for (const body of [
    'subgraph service{cluster=true;label="Service";a;b}',
    '{cluster=1;label="Service";a;b}',
    'subgraph cluster_outer{subgraph service{cluster=true;a}}',
  ]) {
    const result = importDot('digraph{node[shape=box];' + body + '}');
    assert.equal(result.status, 'failed');
    assert.equal(result.nativeSource, undefined);
    assert.equal(result.facts, undefined);
    assert(result.diagnostics.some(d => d.code === 'DOT_CLUSTER_ATTRIBUTE'));
  }
});

test('DOT: cluster graph-name escape is local and an absent cluster label is empty', () => {
  const escaped = importDot('digraph G{node[shape=box];subgraph cluster_a{label="\\G";a}}');
  assert.equal(escaped.facts!.objects.find(o => o.kind === 'group')!.label, 'cluster_a');
  const empty = importDot('digraph G{node[shape=box];subgraph cluster_a{a}}');
  assert.equal(empty.facts!.objects.find(o => o.kind === 'group')!.label, '');
});

test('DOT: anonymous rank constraints require layout review', () => {
  const result = importDot('digraph{node[shape=box];{rank=same;a;b}a->b}');
  assert.equal(result.status, 'needs-review');
  assert(result.diagnostics.some(d => d.code === 'DOT_RANK_CONSTRAINT' && d.impact === 'layout'));
});

test('DOT: boolean constraint forms map explicitly and unknown spellings fail', () => {
  for (const value of ['false', 'False', '0']) {
    const result = importDot('digraph{node[shape=box];a->b[constraint=' + value + ']}');
    assert.equal(result.status, 'ready');
    assert.equal(result.facts!.edges[0].constraint, false);
  }
  for (const value of ['true', 'TRUE', '1']) {
    const result = importDot('digraph{node[shape=box];a->b[constraint=' + value + ']}');
    assert.equal(result.facts!.edges[0].constraint, undefined);
  }
  const unknown = importDot('digraph{node[shape=box];a->b[constraint=unknown]}');
  assert.equal(unknown.status, 'failed');
  assert(unknown.diagnostics.some(d => d.code === 'DOT_BOOLEAN'));
});

test('DOT: unquoted reserved literals are rejected while quoted IDs are kept', () => {
  for (const word of ['graph', 'DiGraph', 'node', 'edge', 'strict', 'subgraph']) {
    const result = importDot('digraph{node[shape=box];' + word + '->a}');
    assert.equal(result.status, 'failed', word);
    assert.equal(result.nativeSource, undefined);
  }
  const quoted = importDot('digraph{node[shape=box];"graph"->a}');
  assert.equal(quoted.status, 'ready');
  assert.equal(quoted.facts!.edges[0].from, 'graph');
});

test('DOT: diagonal/center compass points warn, cardinal sides map, named ports block', () => {
  const approximate = importDot('digraph{node[shape=box];a:ne->b:c}');
  assert.equal(approximate.status, 'needs-review');
  assert(!approximate.diagnostics.some(d => d.severity === 'error'));
  assert.equal(approximate.diagnostics.filter(d => d.code === 'DOT_COMPASS').length, 2);
  const cardinal = importDot('digraph{node[shape=box];a:n->b:w}');
  assert.equal(cardinal.status, 'ready');
  assert.deepEqual([cardinal.facts!.edges[0].fromSide, cardinal.facts!.edges[0].toSide],
    ['top', 'left']);
  assert.equal(importDot('digraph{node[shape=box];a:field->b}').status, 'failed');
});

test('DOT: entity labels and escaped default-ID labels fail instead of changing text', () => {
  for (const [source, code] of [
    ['digraph{node[shape=box];a[label="&beta;"]}', 'DOT_LABEL_ENTITY'],
    ['digraph{node[shape=box];a[label="&#946;"]}', 'DOT_LABEL_ENTITY'],
    ['digraph{node[shape=box];"a\\nb"}', 'DOT_ESCAPED_ID_LABEL'],
    ['digraph{node[shape=box];"a\\nb"[label="\\N"]}', 'DOT_ESCAPED_ID_LABEL'],
  ]) {
    const result = importDot(source);
    assert.equal(result.status, 'failed');
    assert.equal(result.nativeSource, undefined);
    assert(result.diagnostics.some(d => d.code === code));
  }
  assert.equal(importDot('digraph{node[shape=box];"a\\nb"[label="Explicit"]}').status, 'ready');
});

test('DOT: anonymous graph-name escapes fail while named graph context stays exact', () => {
  const anonymous = importDot('digraph{node[shape=box];a[label="\\G"]}');
  assert.equal(anonymous.status, 'failed');
  assert.equal(anonymous.nativeSource, undefined);
  assert(anonymous.diagnostics.some(d => d.code === 'DOT_ANONYMOUS_GRAPH_NAME'));
  const named = importDot('digraph Named{node[shape=box];a[label="\\G"]}');
  assert.equal(named.status, 'ready');
  assert.equal(named.facts!.objects[0].label, 'Named');
});

test('DOT: inherited label amplification is bounded before native source is emitted', () => {
  const source = 'digraph{node[shape=box,label="' + 'x'.repeat(3000) + '"];' +
    Array.from({ length: 400 }, (_, i) => 'n' + i + ';').join('') + '}';
  const result = importDot(source);
  assert.equal(result.status, 'failed');
  assert.equal(result.nativeSource, undefined);
  assert.equal(result.facts, undefined);
  assert(result.diagnostics.some(d => d.code === 'IMPORT_TOTAL_LABEL_LIMIT'));
});

test('DOT: global rankdir applies to every native cluster flow scope', () => {
  for (const [foreign, native] of [['LR', 'right'], ['TB', 'down']]) {
    const result = importDot('digraph{rankdir=' + foreign +
      ';node[shape=box];subgraph cluster_outer{subgraph cluster_inner{a->b}}}');
    assert.equal(result.status, 'ready');
    assert.equal(result.facts!.layouts.length, 3);
    assert(result.facts!.layouts.every(l => l.kind === 'flow' && l.direction === native));
    assert(result.diagnostics.some(d => d.code === 'DOT_CLUSTER_LAYOUT'));
  }
});
