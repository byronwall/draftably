/**
 * Source edits for the editor's layout tools: choosing an engine for a scope (Layout options,
 * Rebuild, Compare) and choosing router settings. Results that depend on an earlier drawing
 * (passes, timeline steps, brush strokes) are written as arrangements instead; see
 * `writeArrangement` in `translate.ts`.
 */
import { LayoutLab } from '../engines/layout-engine.js';
import { RouteLab } from '../engines/routing-engine.js';
import type { LayoutSettings, RoutingSettings } from '../model/types';
import type { Scene } from './compile';
import {
  addRefinement,
  getAttr,
  insertAfter,
  layoutStatement,
  removeWhere,
  statement,
  statements,
} from './source-edits';
import {
  bare,
  ENGINE_PARAMS,
  printStatement,
  readSource,
  ENGINES,
  paramAttr,
  ROUTING_PARAMS,
  type SourceDoc,
  type Statement,
  type Word,
} from './syntax';

export class UnstorableLayout extends Error {}

/** Settings every engine reads, besides its own controls. */
const SHARED: Array<keyof LayoutSettings> = ['nodeGap', 'aspect'];

const value = (v: unknown): Word => bare(String(v));

/** The `layout` attributes for engine settings: the engine's own controls that differ from the defaults. */
export function engineAttrs(settings: LayoutSettings): Array<[string, Word]> {
  const algorithm = LayoutLab.algorithms.find(a => a.id === settings.algorithm);
  if (!algorithm || !ENGINES.includes(settings.algorithm))
    throw new UnstorableLayout(
      `${algorithm?.name ?? settings.algorithm} repairs the current drawing and cannot be saved as a layout recipe.`,
    );
  const attrs: Array<[string, Word]> = [['engine', bare(settings.algorithm)]];
  // `auto` already reads left to right in the compiler's landscape render context.
  if (settings.direction === 'DOWN') attrs.push(['direction', bare('down')]);
  const keys = [...algorithm.controls, ...SHARED] as Array<keyof LayoutSettings>;
  for (const key of keys) {
    const attr = paramAttr(ENGINE_PARAMS, key),
      v = settings[key];
    if (!attr || v === LayoutLab.defaults[key] || v === '') continue;
    // `canvas` depends on the window, which a file must not.
    if (key === 'aspect' && v === 'canvas') continue;
    attrs.push([attr, value(v)]);
  }
  return attrs;
}

/** The `layout` line a scope would get for these settings, or the reason it cannot. */
export function recipeText(scope: string, settings: LayoutSettings): string {
  try {
    return printStatement(statement('layout', [bare(scope)], engineAttrs(settings)));
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** The scope's current `layout` line in `source`, or null when it uses the default recipe. */
export function currentRecipe(source: string, scope: string): string | null {
  const s = layoutStatement(readSource(source), scope);
  return s ? printStatement({ ...s, comment: undefined }) : null;
}

/** Ids inside a scope's subtree (not the scope itself). */
function inside(scene: Scene, scope: string) {
  return new Set(
    scene.objects
      .filter(o => {
        for (let p = o.parent; ; p = scene.byId.get(p)!.parent) {
          if (p === scope) return true;
          if (p === 'root') return false;
        }
      })
      .map(o => o.id),
  );
}

/**
 * Arrange `scope` with the engine in `settings`. Its `layout` line is replaced (keeping
 * `min-width`/`min-height`), and soft position refinements inside it are removed so the engine's
 * arrangement shows. Pins, sizes and nested `layout` lines stay. Returns the number of
 * refinements removed.
 */
export function setLayoutRecipe(
  source: SourceDoc,
  scene: Scene,
  scope: string,
  settings: LayoutSettings,
): number {
  const attrs = engineAttrs(settings);
  const existing = layoutStatement(source, scope);
  for (const key of ['min-width', 'min-height']) {
    const kept = existing && getAttr(existing, key);
    if (kept) attrs.push([key, kept]);
  }
  const next = statement('layout', [bare(scope)], attrs);
  if (existing) {
    next.comment = existing.comment;
    source.lines[source.lines.indexOf(existing)] = next;
  } else if (statements(source).some(s => s.command === 'layout'))
    insertAfter(source, next, s => s.command === 'layout');
  else insertAfter(source, next, s => s.command === 'edge' || s.command === 'node');

  const ids = scope === 'root' ? new Set(scene.objects.map(o => o.id)) : inside(scene, scope);
  const before = source.lines.length;
  removeWhere(source, s => {
    if (['near', 'nudge', 'stay'].includes(s.command)) return ids.has(s.args[0]?.value);
    if (s.command === 'align')
      return getAttr(s, 'strength')?.value !== 'required' && ids.has(s.args[1]?.value);
    return false;
  });
  return before - source.lines.length;
}

/** The `routing` statement for router settings, or null when they are all defaults. */
export function routingStatement(routing: RoutingSettings): Statement | null {
  const attrs: Array<[string, Word]> = [];
  for (const [attr, p] of Object.entries(ROUTING_PARAMS)) {
    const v = routing[p.key];
    if (v !== RouteLab.defaults[p.key]) attrs.push([attr, value(v)]);
  }
  return attrs.length ? statement('routing', [], attrs) : null;
}

/** Replace the file's router settings. Defaults are left out; all defaults removes the line. */
export function setRouting(source: SourceDoc, routing: RoutingSettings) {
  const next = routingStatement(routing),
    existing = statements(source).find(s => s.command === 'routing');
  if (existing && next) {
    next.comment = existing.comment;
    source.lines[source.lines.indexOf(existing)] = next;
  } else if (existing) removeWhere(source, s => s === existing);
  else if (next) {
    if (statements(source).some(s => s.command === 'layout'))
      insertAfter(source, next, s => s.command === 'layout');
    else addRefinement(source, next);
  }
}
