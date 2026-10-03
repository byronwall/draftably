import { render } from 'solid-js/web';
import App from './App';
import './styles.css';

render(() => <App />, document.getElementById('root')!);
void (async () => {
  await import('./editor.js');
  await import('./explorer.js');
  await import('./sculpt.js');
})();
