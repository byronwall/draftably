import logo from '../assets/logo.svg';
import { homeUrl, siteUrl } from '../state/launch';

/** The draftably mark and name, the same way out of the editor as out of any site page. */
export function Brand() {
  return (
    <a class="brand" href={homeUrl()} aria-label="draftably home" title="draftably home">
      <img src={logo} alt="" width="22" height="22" />
      <span class="brand-name">draftably</span>
    </a>
  );
}

/** The site's header links. New tabs, so the diagram here stays as it is. */
export function AppNav() {
  return (
    <nav class="app-nav" aria-label="Site">
      <a href={siteUrl('play')} target="_blank" rel="noopener">
        Playground
      </a>
      <a href={siteUrl('docs')} target="_blank" rel="noopener">
        Docs
      </a>
      <a href="https://github.com/byronwall/draftably" target="_blank" rel="noopener">
        GitHub
      </a>
    </nav>
  );
}
