import { doc } from '../../state/document';
import { runCommand } from '../../state/commands';
import { IconButton } from '../controls';

export function ZoomControls() {
  return (
    <div class="zoom-controls floating-bar" role="toolbar" aria-label="Zoom">
      <IconButton icon="fit" label="Fit diagram" keys="1" onClick={() => runCommand('fit')} />
      <span class="divider" />
      <IconButton icon="minus" label="Zoom out" keys="−" onClick={() => runCommand('zoom-out')} />
      <button
        class="button ghost zoom-level"
        title="Zoom to 100% · 0"
        onClick={() => runCommand('reset-camera')}
      >
        {Math.round(doc.camera.k * 100)}%
      </button>
      <IconButton icon="plus" label="Zoom in" keys="+" onClick={() => runCommand('zoom-in')} />
    </div>
  );
}
