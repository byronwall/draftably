import { Route, Router } from '@solidjs/router';
import { render } from 'solid-js/web';
import { Docs } from './docs/Docs';
import { Landing } from './landing/Landing';
import './site.css';

render(
  () => (
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Route path="/docs/:slug?" component={Docs} />
      <Route path="*" component={Landing} />
    </Router>
  ),
  document.getElementById('root')!,
);
