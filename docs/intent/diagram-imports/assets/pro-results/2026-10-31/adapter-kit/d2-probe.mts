import { D2 } from '@d2lang/d2';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const fixtures: Record<string, string> = {
  nested: `direction: right\nservice: Service {\n  api: API\n  cache: Cache {shape: cylinder}\n  api -> cache: lookup\n}\nclient: Client\nclient -> service.api: request\nservice.api -> client: response\nservice.api -> service.cache: refresh\n`,
  quoted: `a: A\n"a.b": Dotted {\n  "x.y": Leaf\n  inner: {z}\n}\na -> "a.b"."x.y"\n"a.b".inner.z -> "a.b"."x.y"\n`,
  arrows: `a -> b: forward\na <- b: backward\na <-> b: both\na -- b: neither\na -> b: parallel\n`,
  arrowSubset: `a -> b: forward\na <- b: backward\na -- b: neither\na -> b: parallel\n`,
  hiddenDirection: `a -> b: {target-arrowhead.shape: none}\n`,
  styles: `classes: {service: {style.fill: "#ffcc00"}}\na: A {class: service; style.stroke: "#003366"}\nb: B {shape: diamond}\na -> b: request {style.stroke-dash: 3}\n`,
  generative: `vars: {name: Outer}\nclasses: {service: {shape: diamond; style.fill: "#ffeecc"}}\ncluster: Cluster {\n  vars: {name: Inner}\n  a: \${name}\n  b: B\n  *.class: service\n  a -> *: call\n}\noutside: \${name}\n`,
  nullOverride: `a: A\nb: B\na -> b\nb: null\n`,
  configuration: `vars: {d2-config: {theme-id: 4; layout-engine: elk; data: {intent: example}}}\na -> b\n`,
  literalRules: `a: 'vars classes * \${keep}'\n`,
  boards: `a -> b\nlayers: {alternative: {c -> d}}\nscenarios: {x: {a -> c}}\nsteps: {first: {b -> c}; second: {c -> d}}\n`,
  sequence: `shape: sequence_diagram\nalice: Alice\nbob: Bob\nalice -> bob: hello\nbob -> alice: hi\n`,
  table: `users: {shape: sql_table; id: int {constraint: primary_key}; name: text}\nposts: {shape: sql_table; user_id: int}\nposts.user_id -> users.id\n`,
  missingImport: `a: @missing\n`,
  malformed: `a: {\n`,
  image: `remote: Image {shape: image; icon: https://importer-probe.invalid/never-fetch.png}\n`,
  markdownImage: `a: |md\n![do not fetch](https://importer-probe.invalid/never-fetch.png)\n|\n`,
};

const d2 = new D2();
const data: any = { node: process.version, fixtures: {} };
try {
  data.version = await (d2 as any).version();
  data.jsVersion = await (d2 as any).jsVersion();
  for (const [name, source] of Object.entries(fixtures)) {
    const start = performance.now();
    try {
      const result = await d2.compile({ fs: { 'input.d2': source }, inputPath: 'input.d2', options: { layout: 'dagre', themeID: 0, sketch: false } });
      data.fixtures[name] = { elapsedMs: performance.now() - start, source, result };
      console.log(name, JSON.stringify({ ms: performance.now() - start, shapes: result.diagram.shapes.map(s => ({id:s.id, type:s.type, label:s.label, level:s.level})), edges: result.diagram.connections.map(e=>({id:e.id,src:e.src,dst:e.dst,srcArrow:e.srcArrow,dstArrow:e.dstArrow,label:e.label})), graphObjectKeys: Object.keys(result.graph.objects?.[0]??{}), graphEdgeKeys: Object.keys(result.graph.edges?.[0]??{}) }));
    } catch (error) {
      data.fixtures[name] = { elapsedMs: performance.now() - start, source, error: String(error) };
      console.log(name, String(error));
    }
  }
} finally {
  await d2.dispose();
  await writeFile(new URL('./d2-probe-results.json', import.meta.url), JSON.stringify(data, null, 2));
}
