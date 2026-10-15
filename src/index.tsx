import { render } from 'solid-js/web';
import App from './App';
import { detectFileSession } from './state/file-session';

// Opened through `pnpm draftably open`, the diagram comes from a file instead of browser storage.
void detectFileSession().then(() => render(() => <App />, document.getElementById('root')!));
