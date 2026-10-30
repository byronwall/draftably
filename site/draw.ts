import { renderSvg } from '../src/cli/svg';
import { compile, type Diagnostic, type Scene } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';

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
  try {
    const scene = await compile(source);
    const failed = scene.diagnostics.some(d => d.level === 'error');
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
      svg: failed ? null : renderSvg(projectScene(scene)),
      diagnostics: scene.diagnostics,
      items,
      scene,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const line = Number(/^Line (\d+):/.exec(message)?.[1]) || undefined;
    return {
      svg: null,
      diagnostics: [
        {
          level: 'error',
          code: 'compile',
          message: message.replace(/^Line \d+: /, ''),
          line,
          ids: [],
        },
      ],
      items: [],
    };
  }
}

/** The drawing's paper color, so whatever frames it can match. */
export const paperOf = (svg: string) => /<rect[^>]*fill="(#[0-9a-f]+)"/i.exec(svg)?.[1];

/**
 * The viewer build, served next to the site. Links to it need `rel="external"`, or the site's
 * router takes the click and shows the landing page at the editor's URL.
 */
export const appUrl = (example?: string) =>
  `${import.meta.env.BASE_URL}app/${example ? `?example=${encodeURIComponent(example)}` : ''}`;
