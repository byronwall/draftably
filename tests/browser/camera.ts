// One camera, for `pnpm prove:camera`: a viewer and an editor of one file, side by side.
import '../../src/runtime/viewer.css';
import { mountEditor } from '../../src/editor';
import { mountViewer } from '../../src/runtime/viewer';

const source = `diagram "Camera" version=1
group back "Back end"
node web "Web"
node api "API"
node db "Database" in=back
node queue "Queue" in=back
node worker "Worker" in=back
edge e1 web -> api
edge e2 api -> db
edge e3 api -> queue
edge e4 queue -> worker
`;

const events: Record<string, Array<{ reason: string; t: number }>> = { viewer: [], editor: [] };
const viewer = mountViewer(document.getElementById('viewer')!, { toolbar: false });
const editor = mountEditor(document.getElementById('editor')!, { source });
viewer.on('camera', e => events.viewer.push({ reason: e.reason, t: performance.now() }));
editor.on('camera', e => events.editor.push({ reason: e.reason, t: performance.now() }));
const hidden = mountViewer(document.getElementById('hidden')!);

Object.assign(window, {
  viewer,
  editor,
  hidden,
  events,
  ready: Promise.all([viewer.update(source), editor.ready, hidden.update(source)]),
});
