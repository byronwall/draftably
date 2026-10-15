import { createEffect, onCleanup, onMount, Show } from 'solid-js';
import { Canvas } from './components/canvas/Canvas';
import { ComparisonDialog } from './components/comparison/ComparisonDialog';
import { Dialogs } from './components/Dialogs';
import { FileBanner } from './components/FileBanner';
import { Inspector } from './components/Inspector';
import { LayoutLab } from './components/LayoutLab';
import { Menus } from './components/Menus';
import { ObjectsPanel } from './components/ObjectsPanel';
import { StatusBar } from './components/StatusBar';
import { Toast } from './components/Toast';
import { Toolbar } from './components/Toolbar';
import { finishInlineEdit } from './state/actions';
import { setFilePicker } from './state/commands';
import { cancelGeneration } from './state/comparison';
import { installDebugApi } from './state/debug-api';
import { doc, persistNow, restoreSavedDocument, watchOtherTabs } from './state/document';
import { fitView, setReducedMotion, setSpaceHeld } from './state/editor';
import { openFile } from './state/files';
import { handleCopy, handleKeyDown, handleKeyUp, handlePaste } from './state/keyboard';
import { cancelLayout } from './state/layout';
import { releaseModifierZoom, resetModifiers } from './state/pointer';
import { restoreArchive, sculptBeforeUnload, sculptBlur } from './state/sculpt';
import { toast } from './state/toast';
import { inspectorOpen, layoutLabOpen, objectsOpen, showError } from './state/ui';
import './styles/app.css';

/** Add an event listener and return a function that removes it. */
function listen<E extends Event>(
  target: EventTarget,
  type: string,
  handler: (event: E) => unknown,
) {
  const listener = handler as unknown as EventListener;
  target.addEventListener(type, listener);
  return () => target.removeEventListener(type, listener);
}

export default function App() {
  let diagramInput!: HTMLInputElement;
  let imageInput!: HTMLInputElement;
  let replaceImageId: string | null = null;

  setFilePicker((replaceId, accept) => {
    replaceImageId = replaceId;
    const input = accept === 'image' ? imageInput : diagramInput;
    input.value = '';
    input.click();
  });

  const onFiles = async (e: Event & { currentTarget: HTMLInputElement }) => {
    try {
      for (const file of e.currentTarget.files ?? []) await openFile(file, replaceImageId);
    } catch (error) {
      showError(error instanceof Error ? error.message : String(error));
    } finally {
      replaceImageId = null;
    }
  };

  createEffect(() => {
    document.documentElement.dataset.theme = doc.theme;
  });

  onMount(() => {
    installDebugApi();
    const { restored, notice } = restoreSavedDocument();
    restoreArchive();
    requestAnimationFrame(() => {
      if (!restored) fitView();
      if (notice) toast(notice);
    });
    console.info('[diagram-studio] ready', {
      restored,
      objects: doc.graph.nodes.length + doc.graph.groups.length,
    });

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    const onBlur = () => {
      sculptBlur();
      resetModifiers();
      setSpaceHeld(false);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') releaseModifierZoom();
      handleKeyUp(e);
    };
    const onUnload = () => {
      sculptBeforeUnload();
      finishInlineEdit(true);
      persistNow();
    };
    const cleanups = [
      listen(document, 'keydown', handleKeyDown),
      listen(document, 'keyup', onKeyUp),
      listen(document, 'copy', handleCopy),
      listen(document, 'paste', handlePaste),
      listen(window, 'blur', onBlur),
      listen(window, 'beforeunload', onUnload),
      listen(motion, 'change', onMotion),
    ];
    const stopWatching = watchOtherTabs();
    onCleanup(() => {
      cleanups.forEach(stop => stop());
      stopWatching();
      cancelLayout();
      cancelGeneration();
      onUnload();
    });
  });

  return (
    <div
      class="app"
      classList={{ 'objects-open': objectsOpen(), 'inspector-open': inspectorOpen() }}
    >
      <Toolbar />
      <div class="workspace">
        <Show when={objectsOpen()}>
          <ObjectsPanel />
        </Show>
        <Canvas />
        <FileBanner />
        <Show when={inspectorOpen()}>
          <Inspector />
        </Show>
        <Show when={layoutLabOpen()}>
          <LayoutLab />
        </Show>
      </div>
      <StatusBar />
      <Menus />
      <Dialogs />
      <ComparisonDialog />
      <Toast />
      <input
        ref={diagramInput}
        type="file"
        hidden
        accept=".json,.svg,image/png,image/jpeg,image/webp,image/gif"
        onChange={onFiles}
      />
      <input
        ref={imageInput}
        type="file"
        hidden
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onFiles}
      />
    </div>
  );
}
