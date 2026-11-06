import { runCommand } from '../../state/commands';
import { CommandButton, tip } from '../controls';
import { useDiagramSession } from '../session-context';

export function ZoomControls() {
  const s = useDiagramSession();
  return (
    <div class="zoom-controls floating-bar" role="toolbar" aria-label="Zoom">
      <CommandButton command="fit" />
      <span class="divider" />
      <CommandButton command="zoom-out" />
      <button
        class="button ghost zoom-level"
        {...tip('Zoom to 100%', '0')}
        onClick={() => runCommand('reset-camera')}
      >
        {Math.round(s.doc.camera.k * 100)}%
      </button>
      <CommandButton command="zoom-in" />
    </div>
  );
}
