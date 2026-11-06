import { splitProps } from 'solid-js';
import { Canvas, type CanvasProps } from '../components/canvas/Canvas';
import { DiagramSessionProvider } from '../components/session-context';
import type { DiagramSession } from '../state/session';

/** One live diagram: the canvas for `session`. A page can show any number of them. */
export function Editor(props: CanvasProps & { session: DiagramSession }) {
  const [own, canvas] = splitProps(props, ['session']);
  return (
    <DiagramSessionProvider session={own.session}>
      <Canvas {...canvas} />
    </DiagramSessionProvider>
  );
}
