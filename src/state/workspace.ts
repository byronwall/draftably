import { createRoot, createSignal } from 'solid-js';
import type { WorkspaceInfo } from '../server/workspace';

/** The served folder, or null on the static site and in an embedded editor. */
export const [workspace, setWorkspace] = createRoot(() => createSignal<WorkspaceInfo | null>(null));
