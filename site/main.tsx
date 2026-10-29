import { Route, Router } from '@solidjs/router';
import { render } from 'solid-js/web';
import { Landing } from './landing/Landing';
import './site.css';

render(
  () => (
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Route path="*" component={Landing} />
    </Router>
  ),
  document.getElementById('root')!,
);
