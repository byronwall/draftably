import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LayoutLab } from '../src/engines/layout-engine.js';
import { RouteLab } from '../src/engines/routing-engine.js';
import { checkSource, compile } from '../src/dsl/compile';
import {
  currentRecipe,
  recipeText,
  setLayoutRecipe,
  setRouting,
  UnstorableLayout,
} from '../src/dsl/layout-edits';
import { parseModel, printSource, readSource } from '../src/dsl/syntax';

const checkout = readFileSync(path.join(__dirname, '../examples/checkout.draft'), 'utf8');
const settings = (patch: object) => LayoutLab.settings({ ...patch, mode: 'rebuild' });

function withRecipe(text: string, scope: string, patch: object) {
  const source = readSource(text);
  const removed = setLayoutRecipe(source, checkSource(text), scope, settings(patch));
  return { text: printSource(source), removed };
}

describe('layout recipes', () => {
  it('replaces the scope line with the engine and only non-default settings', () => {
    const { text } = withRecipe(checkout, 'root', { algorithm: 'layered', rankGap: 96 });
    expect(text).toContain('layout root engine=layered rank-gap=96\n');
    expect(text).not.toContain('layout root flow');
    expect(text).toContain('# Customer-facing entry points.');
    expect(parseModel(text).layouts.find(l => l.scope === 'root')!.engine).toEqual({
      algorithm: 'layered',
      params: { rankGap: 96 },
    });
  });

  it('removes soft refinements inside the scope and keeps pins and nested lines', () => {
    const refined =
      checkout + 'near payments orders side=below gap=40\nstay db x=10 y=10\npin web x=0 y=0\n';
    const root = withRecipe(refined, 'root', { algorithm: 'stress' });
    expect(root.removed).toBe(2);
    expect(root.text).toContain('pin web x=0 y=0');
    expect(root.text).toContain('layout services row gap=56');

    const group = withRecipe(refined, 'services', { algorithm: 'grid', direction: 'DOWN' });
    expect(group.removed).toBe(1);
    expect(group.text).toContain('stay db x=10 y=10');
    expect(group.text).toContain('layout services engine=grid direction=down\n');
  });

  it('keeps reserved group sizes and adds a line for a scope without one', () => {
    const sized = checkout.replace(
      'layout services row gap=56',
      'layout services row min-width=700',
    );
    expect(withRecipe(sized, 'services', { algorithm: 'tree' }).text).toContain(
      'layout services engine=tree min-width=700',
    );
    expect(withRecipe(checkout, 'clients', { algorithm: 'grid' }).text).toMatch(
      /layout services row gap=56\nlayout clients engine=grid/,
    );
  });

  it('compiles the written recipe to the engine arrangement', async () => {
    const { text } = withRecipe(checkout, 'root', { algorithm: 'layered', direction: 'DOWN' });
    const scene = await compile(text);
    expect(scene.diagnostics.filter(d => d.level === 'error')).toEqual([]);
    expect(scene.byId.get('db')!.y).toBeGreaterThan(scene.byId.get('web')!.y);
  });

  it('refuses engines that cannot be recomputed from the file', () => {
    expect(() => withRecipe(checkout, 'root', { algorithm: 'separate' })).toThrow(UnstorableLayout);
    expect(recipeText('root', settings({ algorithm: 'separate' }))).toMatch(/cannot be saved/);
  });

  it('describes the current line', () => {
    expect(currentRecipe(checkout, 'services')).toBe('layout services row gap=56');
    expect(currentRecipe(checkout, 'clients')).toBeNull();
  });
});

describe('routing line', () => {
  it('writes only non-default router settings and removes the line at defaults', () => {
    const source = readSource(checkout);
    setRouting(source, RouteLab.settings({ edgeGap: 28, cornerRadius: 0 }));
    const text = printSource(source);
    expect(text).toContain('routing edge-gap=28 corner-radius=0\n');
    expect(parseModel(text).routing).toEqual({ edgeGap: 28, cornerRadius: 0 });

    const again = readSource(text);
    setRouting(again, RouteLab.settings({ passes: 2 }));
    expect(printSource(again).match(/^routing.*$/gm)).toEqual(['routing passes=2']);

    setRouting(again, RouteLab.defaults);
    expect(printSource(again)).not.toContain('routing');
  });
});
