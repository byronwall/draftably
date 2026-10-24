import { Show } from 'solid-js';
import { render } from 'solid-js/web';
import App from './App';
import { StartScreen } from './components/StartScreen';
import { launch, launchView, navigateInPlace } from './state/launch';
import './styles/app.css';

// `draftably open` serves a folder: the viewer opens a file, an example, or the start page, and
// switches between the folder's files in place.
void launch().then(() => {
  navigateInPlace();
  render(
    () => (
      <Show when={launchView() === 'start'} fallback={<App />}>
        <StartScreen variant="page" />
      </Show>
    ),
    document.getElementById('root')!,
  );
});
