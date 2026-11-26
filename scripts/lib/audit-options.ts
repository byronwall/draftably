// The same generated sources go through both engines in audit:compare.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ALGORITHMS } from '../../src/engines/layout/settings';
import { MARKERS } from '../../src/model/markers';
import { FONT_ROLES } from '../../src/model/fonts';
import { THEME_IDS } from '../../src/model/appearance';
import {
  DSL_SHAPES,
  ENGINES,
  ENGINE_PARAMS,
  ROUTING_PARAMS,
  ORG_LEAVES,
  FITS,
  parseModel,
  readSource,
} from '../../src/dsl/syntax';

export function writeOptions(root: string, dir: string) {
  const example = (name: string) =>
    readFileSync(path.join(root, 'examples', name + '.draft'), 'utf8');
  function save(name: string, source: string) {
    const warnings = parseModel(source).warnings;
    if (warnings.length) throw new Error(name + ': ' + warnings.map(w => w.message).join(', '));
    const folder = path.join(dir, name);
    mkdirSync(folder, { recursive: true });
    writeFileSync(path.join(folder, 'v0.draft'), source);
  }
  function replaceLine(source: string, pattern: RegExp, replacement: string) {
    const lines = source.split('\n');
    if (lines.filter(line => pattern.test(line)).length !== 1)
      throw new Error('Expected one ' + pattern);
    return lines.map(line => (pattern.test(line) ? replacement : line)).join('\n');
  }

  const checkout = example('checkout');
  const layout = (value: string) => replaceLine(checkout, /^layout root /, 'layout root ' + value);
  for (const engine of ENGINES) {
    save('engine-' + engine, layout('engine=' + engine));
    const controls = ALGORITHMS.find(a => a.id === engine)!.controls;
    for (const [attr, spec] of Object.entries(ENGINE_PARAMS)) {
      if (!controls.some(control => control === spec.key)) continue;
      for (const value of values(spec))
        save(
          [engine, attr, value].join('-'),
          layout('engine=' + engine + ' ' + attr + '=' + value),
        );
    }
  }
  // Cold layout also accepts node spacing and target aspect outside the editor controls.
  for (const attr of ['node-gap', 'aspect']) {
    for (const value of values(ENGINE_PARAMS[attr]))
      save('layered-' + attr + '-' + value, layout('engine=layered ' + attr + '=' + value));
  }
  for (const [attr, spec] of Object.entries(ROUTING_PARAMS)) {
    for (const value of values(spec))
      save('routing-' + attr + '-' + value, checkout + '\nrouting ' + attr + '=' + value + '\n');
  }

  for (const shape of DSL_SHAPES) {
    if (shape === 'code' || shape === 'marker') {
      save('shape-' + shape, example(shape === 'code' ? 'code-review' : 'prompt-request'));
    } else {
      save(
        'shape-' + shape,
        replaceLine(
          checkout,
          /^node payments /,
          'node payments "Payments" in=services shape=' + shape,
        ),
      );
    }
  }
  for (const end of ['head', 'tail']) {
    for (const marker of MARKERS) {
      save(
        end + '-' + marker,
        replaceLine(
          checkout,
          /^edge charge /,
          'edge charge orders -> payments "authorize" ' + end + '=' + marker,
        ),
      );
    }
  }
  for (const font of FONT_ROLES) {
    save(
      'font-' + font,
      replaceLine(
        example('theme-proof'),
        /^theme /,
        'theme fieldnotes title-font=' + font + ' annotation-font=' + font,
      ),
    );
  }
  save(
    'sequence-activations-off',
    replaceLine(
      example('checkout-sequence'),
      /^layout root /,
      'layout root sequence activations=off',
    ),
  );
  save(
    'cells-ruler-off',
    replaceLine(
      example('tcp-header'),
      /^layout tcp /,
      'layout tcp cells unit=bit columns=32 unit-width=26 ruler=off',
    ),
  );
  for (const fit of Object.keys(FITS)) save('fit-' + fit, layout('flow fit=' + fit));
  for (const theme of THEME_IDS)
    save('theme-' + theme, replaceLine(example('theme-proof'), /^theme /, 'theme ' + theme));
  for (const leaves of ORG_LEAVES)
    save(
      'orgchart-' + leaves,
      replaceLine(
        example('org-chart'),
        /^layout root /,
        'layout root orgchart root=ceo leaves=' + leaves,
      ),
    );
  for (const direction of ['right', 'down'])
    save(
      'mindmap-' + direction,
      replaceLine(
        example('launch-plan'),
        /^layout root /,
        'layout root mindmap root=launch direction=' + direction,
      ),
    );
  for (const name of [
    'checkout',
    'support-lanes',
    'checkout-sequence',
    'company-history',
    'bug-timeline',
    'tcp-header',
    'billing-schema',
  ])
    save(name, example(name));
  for (const hint of ['pin', 'stay'])
    for (const clearance of values(ROUTING_PARAMS.clearance))
      save(
        hint + '-clearance-' + clearance,
        checkout + '\n' + hint + ' payments x=0 y=0\nrouting clearance=' + clearance + '\n',
      );
}

function values(spec: { min: number; max: number } | { choices: readonly string[] }) {
  if ('min' in spec) return [spec.min, spec.max];
  return spec.choices.length ? spec.choices : ['web']; // Tree root in checkout.draft.
}

type SetResults = {
  name: string;
  dir: string;
  renders: { slug: string; file: string; error?: string }[];
};

/** Count successful renders once per feature. Preserve the set so usage remains visible. */
export function writeCoverage(outDir: string, sets: SetResults[]) {
  const rows = new Map<string, number[]>();
  const row = (key: string) => {
    if (!rows.has(key))
      rows.set(
        key,
        sets.map(() => 0),
      );
    return rows.get(key)!;
  };
  for (const engine of ENGINES) row('engine ' + engine);
  for (const key of Object.keys(ENGINE_PARAMS)) row('engine option ' + key);
  for (const key of Object.keys(ROUTING_PARAMS)) row('routing option ' + key);
  for (const shape of DSL_SHAPES) row('explicit shape ' + shape);
  for (const end of ['head', 'tail']) for (const marker of MARKERS) row(end + ' marker ' + marker);
  for (const theme of THEME_IDS) row('explicit theme ' + theme);
  for (const recipe of [
    'flow',
    'row',
    'column',
    'lanes',
    'sequence',
    'cells',
    'timeline',
    'table',
    'mindmap',
    'orgchart',
  ])
    row('recipe ' + recipe);
  sets.forEach(({ dir, renders }, index) => {
    for (const render of renders) {
      if (render.error) continue;
      const source = readFileSync(path.join(dir, render.slug, render.file), 'utf8');
      const doc = readSource(source);
      const model = parseModel(doc);
      const used = new Set<string>();
      if (!model.layouts.some(l => l.scope === 'root')) used.add('implicit root layout');
      for (const layout of model.layouts) {
        const recipe = layout.orgchart
          ? 'orgchart'
          : layout.mindmap
            ? 'mindmap'
            : layout.table
              ? 'table'
              : layout.algorithm;
        if (layout.engine && !layout.orgchart && !layout.mindmap) {
          used.add('engine ' + layout.engine.algorithm);
          for (const [attr, spec] of Object.entries(ENGINE_PARAMS))
            if (spec.key in layout.engine.params) used.add('engine option ' + attr);
        } else used.add('recipe ' + recipe);
      }
      for (const [attr, spec] of Object.entries(ROUTING_PARAMS))
        if (spec.key in model.routing) used.add('routing option ' + attr);
      for (const line of doc.lines) {
        if (line.kind !== 'statement') continue;
        used.add('statement ' + line.command);
        for (const [attr, word] of line.attrs) {
          used.add('written ' + line.command + ' ' + attr);
          if (line.command === 'node' && attr === 'shape') used.add('explicit shape ' + word.value);
          if (line.command === 'edge' && (attr === 'head' || attr === 'tail'))
            used.add(attr + ' marker ' + word.value);
        }
        if (line.command === 'theme') used.add('explicit theme ' + line.args[0].value);
      }
      for (const key of used) row(key)[index]++;
    }
  });
  const table = [
    '# Diagram eval coverage',
    '',
    'Each cell counts successful renders that use the feature. An edit counts as another render. Options are generated probes. Population is the measured sample of real diagrams.',
    '',
    '| Feature | ' + sets.map(s => s.name).join(' | ') + ' |',
    '| --- | ' + sets.map(() => '---:').join(' | ') + ' |',
    ...Array.from(rows)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, counts]) => '| ' + key + ' | ' + counts.join(' | ') + ' |'),
  ];
  writeFileSync(path.join(outDir, 'coverage.md'), table.join('\n') + '\n');
}
