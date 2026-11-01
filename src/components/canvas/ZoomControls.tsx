import { doc } from '../../state/document';
import { runCommand } from '../../state/commands';
import { CommandButton, tip } from '../controls';

export function ZoomControls() {
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
        {Math.round(doc.camera.k * 100)}%
      </button>
      <CommandButton command="zoom-in" />
    </div>
  );
}
