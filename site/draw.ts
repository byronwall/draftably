import { renderSvg } from '../src/cli/svg';
import { compile, type Diagnostic } from '../src/dsl/compile';
import { projectScene } from '../src/dsl/project';

export interface Drawing {
  /** The SVG, or null when the source has errors. */
  svg: string | null;
  diagnostics: Diagnostic[];
}

/** Compile `.draft` source and draw it the way `draftably inspect --svg` does. */
export async function draw(source: string): Promise<Drawing> {
  try {
    const scene = await compile(source);
    const failed = scene.diagnostics.some(d => d.level === 'error');
    return { svg: failed ? null : renderSvg(projectScene(scene)), diagnostics: scene.diagnostics };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { svg: null, diagnostics: [{ level: 'error', code: 'compile', message, ids: [] }] };
  }
}

/** The drawing's paper color, so whatever frames it can match. */
export const paperOf = (svg: string) => /<rect[^>]*fill="(#[0-9a-f]+)"/i.exec(svg)?.[1];

/** The viewer build, served next to the site. */
export const appUrl = (example?: string) =>
  `${import.meta.env.BASE_URL}app/${example ? `?example=${encodeURIComponent(example)}` : ''}`;
