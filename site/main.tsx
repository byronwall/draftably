import { Route, Router } from '@solidjs/router';
import { ErrorBoundary, lazy } from 'solid-js';
import { render } from 'solid-js/web';
import { encodeSource } from '../src/lib/source-hash';
import { Docs } from './docs/Docs';
import { Landing } from './landing/Landing';
import { incoming } from './reopen';
import { Shell } from './Shell';
import { SiteNav } from './SiteNav';
import './site.css';

// The playground brings the code editor; the landing page never loads it.
const Playground = lazy(() => import('./play/Playground').then(m => ({ default: m.Playground })));

/**
 * A page left open across a deploy can ask for a module that no longer exists. A reload gets a
 * page that names the current modules. Source from a dropped file goes in the address first, since
 * only the page's memory holds it.
 */
function PlaygroundFailed() {
  const reload = async () => {
    const handed = incoming();
    if (handed) history.replaceState(null, '', `#${await encodeSource(handed.source)}`);
    location.reload();
  };
  return (
    <div class="load-failed" role="alert">
      <SiteNav current="play" />
      <h1>The Playground did not load</h1>
      <p>The site may have just updated. Reloading keeps your source.</p>
      <button type="button" class="tool primary" onClick={() => void reload()}>
        Reload
      </button>
    </div>
  );
}

function PlaygroundPage() {
  return (
    <ErrorBoundary fallback={<PlaygroundFailed />}>
      <Playground />
    </ErrorBoundary>
  );
}

render(
  () => (
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, '')} root={Shell}>
      <Route path="/play" component={PlaygroundPage} />
      <Route path="/docs/:slug?" component={Docs} />
      <Route path="*" component={Landing} />
    </Router>
  ),
  document.getElementById('root')!,
);
