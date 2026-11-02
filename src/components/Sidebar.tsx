import { Show } from 'solid-js';
import { doc } from '../state/document';
import { runCommand } from '../state/commands';
import { workspace } from '../state/launch';
import {
  filesShown,
  resetSidebarWidth,
  setCreatingFile,
  setFilesOpen,
  setObjectsOpen,
  setSidebarWidth,
  sidebarWidth,
} from '../state/ui';
import { IconButton, tip } from './controls';
import { FilesPanel } from './FilesPanel';
import { ObjectsPanel } from './ObjectsPanel';
import { ResizeHandle } from './ResizeHandle';

/** The left side: this folder's diagrams and the open diagram's objects, one at a time. */
export function Sidebar() {
  const objects = () => doc.graph.nodes.length + doc.graph.groups.length;
  return (
    <aside class="panel sidebar" aria-label="Sidebar">
      <header class="sidebar-head">
        <div class="sidebar-tabs" role="tablist" aria-label="Sidebar">
          <Show when={workspace()}>
            <button
              type="button"
              role="tab"
              aria-selected={filesShown()}
              {...tip('Diagrams', 'F', 'The diagrams in this folder.')}
              onClick={() => setFilesOpen(true)}
            >
              Diagrams <span class="count">{workspace()?.files.length ?? 0}</span>
            </button>
          </Show>
          <button
            type="button"
            role="tab"
            aria-selected={!filesShown()}
            {...tip('Objects', '[', 'Every shape and container in this diagram.')}
            onClick={() => setObjectsOpen(true)}
          >
            Objects <span class="count">{objects()}</span>
          </button>
        </div>
        <Show when={filesShown()}>
          <IconButton icon="plus" label="New diagram" onClick={() => setCreatingFile(true)} />
        </Show>
        <IconButton
          icon="close"
          label="Close sidebar"
          keys={filesShown() ? 'F' : '['}
          onClick={() => runCommand(filesShown() ? 'toggle-files' : 'toggle-objects')}
        />
      </header>
      <Show when={filesShown()} fallback={<ObjectsPanel />}>
        <FilesPanel />
      </Show>
      <ResizeHandle
        edge="right"
        label="Resize sidebar"
        width={sidebarWidth()}
        onResize={setSidebarWidth}
        onReset={resetSidebarWidth}
      />
    </aside>
  );
}
