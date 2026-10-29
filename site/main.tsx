import { Route, Router } from '@solidjs/router';
import { lazy } from 'solid-js';
import { render } from 'solid-js/web';
import { Docs } from './docs/Docs';
import { Landing } from './landing/Landing';
import { Shell } from './Shell';
import './site.css';

// The playground brings the code editor; the landing page never loads it.
const Playground = lazy(() => import('./play/Playground').then(m => ({ default: m.Playground })));

render(
  () => (
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')} root={Shell}>
      <Route path="/play" component={Playground} />
      <Route path="/docs/:slug?" component={Docs} />
      <Route path="*" component={Landing} />
    </Router>
  ),
  document.getElementById('root')!,
);
