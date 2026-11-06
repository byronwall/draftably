import { Show } from 'solid-js';
import { render } from 'solid-js/web';
import App from './App';
import { DiagramSessionProvider } from './components/session-context';
import { StartScreen } from './components/StartScreen';
import { STORAGE_KEY } from './lib/saved-diagram';
import { setActiveSession } from './state/active-session';
import { closeComparison } from './state/comparison';
import { launch, launchView, navigateInPlace } from './state/launch';
import { openLink } from './state/open-link';
import { createDiagramSession } from './state/session';
import { closeMenu, confirmAction } from './state/ui';
import './styles/app.css';

// The app edits one diagram: the browser's own, a served file, or an example.
const session = createDiagramSession({
  storageKey: STORAGE_KEY,
  urlState: true,
  confirm: confirmAction,
  openLink: href => openLink(session, href),
  onInteract: closeMenu,
});
// Opening a timeline closes Compare, which belongs to the app shell.
session.setComparisonCloser(closeComparison);
setActiveSession(session);

// `draftably open` serves a folder: the viewer opens a file, an example, or the start page, and
// switches between the folder's files in place.
void launch().then(() => {
  navigateInPlace();
  render(
    () => (
      <DiagramSessionProvider session={session}>
        <Show when={launchView() === 'start'} fallback={<App />}>
          <StartScreen variant="page" />
        </Show>
      </DiagramSessionProvider>
    ),
    document.getElementById('root')!,
  );
});
