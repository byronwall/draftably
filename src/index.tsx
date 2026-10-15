import { render } from 'solid-js/web';
import App from './App';
import { StartScreen } from './components/StartScreen';
import { launch } from './state/launch';
import './styles/app.css';

// `meld open` serves a folder: the viewer opens a file, an example, or the start page.
void launch().then(mode =>
  render(
    () => (mode === 'start' ? <StartScreen variant="page" /> : <App />),
    document.getElementById('root')!,
  ),
);
