import type { Diagnostic, Scene } from '../src/dsl/compile';
import { renderWithScene } from '../src/runtime/render';

/** A node, group or edge and the source line that declares it. */
export interface DrawnItem {
  id: string;
  type: 'node' | 'group' | 'edge';
  label: string;
  line: number;
  /** An edge's start and finish ids. */
  from?: string;
  to?: string;
}

export interface Drawing {
  /** The SVG, or null when the source has errors. */
  svg: string | null;
  diagnostics: Diagnostic[];
  items: DrawnItem[];
  /** The compiled scene, when the source compiled. */
  scene?: Scene;
}

/** Compile `.draft` source and draw it the way `draftably inspect --svg` does. */
export async function draw(source: string): Promise<Drawing> {
  const { result, scene } = await renderWithScene(source);
  if (scene) {
    const failed = !result.ok || scene.diagnostics.some(d => d.level === 'error');
    const { objects, edges } = scene.model;
    const items: DrawnItem[] = [
      ...objects.map(o => ({ id: o.id, type: o.type, label: o.label, line: o.line })),
      ...edges.map(e => ({
        id: e.id,
        type: 'edge' as const,
        label: e.label ?? '',
        line: e.line,
        from: e.source,
        to: e.target,
      })),
    ];
    return {
      svg: failed ? null : result.value.svg,
      diagnostics: result.ok
        ? scene.diagnostics
        : result.diagnostics.map(d => ({
            level: d.severity === 'info' ? 'warning' : d.severity,
            code: d.nativeCode ?? d.code,
            message: d.message,
            line: d.location?.line,
            ids: [...d.itemIds],
          })),
      items,
      scene,
    };
  }
  const issue = result.ok ? undefined : result.diagnostics[0];
  return {
    svg: null,
    diagnostics: [
      {
        level: 'error',
        code: 'compile',
        message: issue?.message ?? 'The diagram could not be drawn.',
        line: issue?.location?.line,
        ids: [...(issue?.itemIds ?? [])],
      },
    ],
    items: [],
  };
}

/** The drawing's paper color, so whatever frames it can match. */
export const paperOf = (svg: string) => /<rect[^>]*fill="(#[0-9a-f]+)"/i.exec(svg)?.[1];

/**
 * The viewer build, served next to the site. Links to it need `rel="external"`, or the site's
 * router takes the click and shows the landing page at the editor's URL.
 */
export const appUrl = (example?: string) =>
  `${import.meta.env.BASE_URL}app/${example ? `?example=${encodeURIComponent(example)}` : ''}`;
