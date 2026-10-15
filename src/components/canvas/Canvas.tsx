import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { selection } from '../../state/document';
import { doc } from '../../state/document';
import { drag, registerCanvas, setStageSize, spaceHeld, tool } from '../../state/editor';
import { registerSceneElement, openFile } from '../../state/files';
import * as pointer from '../../state/pointer';
import { edgeIds, geometry, groupIds, nodeIds, routesById, sceneRects } from '../../state/scene';
import { brushActive, brushPointerLeave, cancelStroke, timelineOpen } from '../../state/sculpt';
import { runCommand } from '../../state/commands';
import { toast } from '../../state/toast';
import { openMenu } from '../../state/ui';
import { BrushDock } from '../sculpt/BrushDock';
import { TimelineDeck } from '../sculpt/TimelineDeck';
import { EdgeView } from '../scene/EdgeView';
import { GroupView } from '../scene/GroupView';
import { NodeView } from '../scene/NodeView';
import { InlineEditor } from './InlineEditor';
import { Overlay } from './Overlay';
import { ZoomControls } from './ZoomControls';
import { LayoutPreviewBar } from '../LayoutPreviewBar';
import { Icon } from '../Icon';
import './canvas.css';

const CANVAS_LABEL =
  'Diagram canvas. N adds a box. Enter edits. C connects. Drag nodes to edit; drag background to pan. ' +
  'Escape returns to Edit. Shift drag selects. Two-finger scroll pans; pinch zooms. Question mark opens shortcuts.';

export function Canvas() {
  let stage!: HTMLElement;
  let svg!: SVGSVGElement;
  let world!: SVGGElement;
  const [dropping, setDropping] = createSignal(false);
  let dragDepth = 0;

  onMount(() => {
    registerCanvas(svg);
    registerSceneElement(world);
    const observer = new ResizeObserver(([entry]) =>
      setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(stage);
    svg.addEventListener('wheel', pointer.onWheel, { passive: false });
    onCleanup(() => {
      observer.disconnect();
      svg.removeEventListener('wheel', pointer.onWheel);
    });
  });

  const camera = () => doc.camera;
  const isSelected = (id: string) => selection().has(id);
  const empty = () => !nodeIds().length && !groupIds().length;

  const onPointerUp = (e: PointerEvent) => {
    pointer.onPointerUp(e);
    try {
      svg.releasePointerCapture(e.pointerId);
    } catch {
      // Already released.
    }
  };

  const onDrop = async (e: DragEvent) => {
    e.preventDefault();
    dragDepth = 0;
    setDropping(false);
    try {
      for (const file of e.dataTransfer?.files ?? []) await openFile(file);
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error));
    }
  };
  const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');

  return (
    <main
      ref={stage}
      class="stage"
      classList={{
        'is-dragging': !!drag() && drag()!.kind === 'pan',
        'space-held': spaceHeld(),
        'has-timeline': timelineOpen(),
        'has-brush': brushActive(),
      }}
      data-tool={tool()}
      aria-label="Diagram workspace"
      onDragEnter={e => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth++;
        setDropping(true);
      }}
      onDragOver={e => hasFiles(e) && e.preventDefault()}
      onDragLeave={() => {
        if (--dragDepth <= 0) setDropping(false);
      }}
      onDrop={onDrop}
    >
      <svg
        ref={svg}
        class="canvas"
        role="application"
        tabindex="0"
        aria-label={CANVAS_LABEL}
        onPointerDown={pointer.onPointerDown}
        onPointerMove={pointer.onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => pointer.resetModifiers()}
        onPointerLeave={brushPointerLeave}
        onLostPointerCapture={() => brushActive() && cancelStroke()}
        onDblClick={pointer.onDoubleClick}
        onContextMenu={e => {
          e.preventDefault();
          pointer.selectForContextMenu(e);
          openMenu('context', { x: e.clientX, y: e.clientY });
        }}
      >
        <defs>
          <pattern
            id="canvas-dots"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${camera().x % (24 * camera().k)},${camera().y % (24 * camera().k)}) scale(${camera().k})`}
          >
            <circle cx="1" cy="1" r=".7" fill="var(--dot)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#canvas-dots)" />
        <g
          ref={world}
          class="scene"
          classList={{ connecting: tool() === 'connect' }}
          transform={`translate(${camera().x},${camera().y}) scale(${camera().k})`}
        >
          <g>
            <For each={groupIds()}>
              {id => (
                <GroupView
                  doc={doc}
                  id={id}
                  rect={sceneRects().get(id)!}
                  selected={isSelected(id)}
                  dropTarget={drag()?.dropTargetId === id}
                  interactive
                  zoom={camera().k}
                />
              )}
            </For>
          </g>
          <g>
            <For each={edgeIds()}>
              {id => (
                <Show when={routesById().get(id)}>
                  {route => (
                    <EdgeView doc={doc} route={route()} selected={isSelected(id)} interactive />
                  )}
                </Show>
              )}
            </For>
          </g>
          <g>
            <For each={nodeIds()}>
              {id => (
                <NodeView
                  doc={doc}
                  id={id}
                  rect={geometry(id)}
                  selected={isSelected(id)}
                  interactive
                  zoom={camera().k}
                />
              )}
            </For>
          </g>
          <Overlay />
        </g>
      </svg>

      <Show when={empty()}>
        <div class="empty-canvas">
          <h2>Draw something.</h2>
          <p>
            <kbd>N</kbd> adds a box. Type a title, then <kbd>Tab</kbd> to keep going.
          </p>
          <button class="button primary" onClick={() => runCommand('quick-build')}>
            Build from a list <kbd>B</kbd>
          </button>
        </div>
      </Show>
      <InlineEditor />
      <ZoomControls />
      <TimelineDeck />
      <BrushDock />
      <LayoutPreviewBar />
      <Show when={dropping()}>
        <div class="drop-overlay">
          <Icon name="upload" />
          Drop an image or a saved diagram
        </div>
      </Show>
    </main>
  );
}
