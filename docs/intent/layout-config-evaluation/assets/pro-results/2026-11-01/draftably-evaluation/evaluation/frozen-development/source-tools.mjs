import fs from 'node:fs';
import path from 'node:path';
import { bundleRoot } from './adapter.mjs';

export function sourceFor(task, adapter) {
  let source = task.sourceText ?? fs.readFileSync(path.resolve(bundleRoot, task.sourcePath), 'utf8');
  if (task.layout) {
    const { engine, recipe, direction, attrs = {}, remove = false, keepFit = true } = task.layout;
    const parsed = adapter.syntax.readSource(source);
    const root = parsed.lines.find(s => s.kind === 'statement' && s.command === 'layout' && s.args[0]?.value === 'root');
    const retained = Object.fromEntries((root?.attrs ?? []).filter(([k]) => ['min-width', 'min-height', ...(keepFit ? ['fit'] : [])].includes(k)).map(([k, v]) => [k, v.value]));
    parsed.lines = parsed.lines.filter(s => s !== root);
    if (!remove) {
      const values = { ...retained, ...(engine ? { engine } : {}), ...(direction ? { direction: direction.toLowerCase() } : {}), ...attrs };
      const newLine = `layout root${recipe ? ` ${recipe}` : ''}${Object.entries(values).filter(([, v]) => v !== null && v !== '').map(([k, v]) => ` ${k}=${v}`).join('')}`;
      parsed.lines.push(...adapter.syntax.readSource(newLine).lines.filter(s => s.kind === 'statement'));
    }
    source = adapter.syntax.printSource(parsed);
  }
  if (task.rename || task.reorder) {
    const parsed = adapter.syntax.readSource(source);
    const objects = parsed.lines.filter(s => s.kind === 'statement' && ['node', 'group'].includes(s.command));
    if (task.rename) {
      const map = new Map(objects.map((s, i) => [s.args[0].value, `zz${String(objects.length-i).padStart(4,'0')}`]));
      for (const statement of parsed.lines) {
        if (statement.kind !== 'statement') continue;
        for (const word of [...statement.args, ...statement.attrs.map(([, value]) => value)]) {
          if (!word.quoted && map.has(word.value)) word.value = map.get(word.value);
        }
      }
    }
    if (task.reorder) {
      // Only declaration order changes; labels, references, hints and topology remain intact.
      const reverse = [...objects].reverse();
      let i=0;
      parsed.lines = parsed.lines.map(s => objects.includes(s) ? reverse[i++] : s);
    }
    source = adapter.syntax.printSource(parsed);
  }
  return source;
}

export function objectIds(source, adapter) {
  return adapter.syntax.parseModel(source).objects.map(o => o.id);
}

export function descendants(doc, id) {
  const all = [...doc.graph.nodes, ...doc.graph.groups];
  const out = new Set([id]);
  for (let changed=true; changed;) {
    changed=false;
    for (const n of all) if (out.has(n.parentId) && !out.has(n.id)) { out.add(n.id); changed=true; }
  }
  return [...out];
}

export function localPinFailures(scene) {
  if (!scene) return [];
  return scene.model.hints.filter(h => h.type === 'pin').flatMap(h => {
    const o=scene.byId.get(h.id);
    return !o || Math.abs(o.localX-h.x)>0.5 || Math.abs(o.localY-h.y)>0.5
      ? [`pin ${h.id}: required local (${h.x},${h.y}), got (${o?.localX},${o?.localY})`] : [];
  });
}
