import { A } from '@solidjs/router';
import { appUrl } from './draw';

const GITHUB = 'https://github.com/byronwall/draftably';

/**
 * The links every page's header carries, in one order, with the current section marked. Site
 * pages move with the router; the editor and GitHub are other sites and load normally.
 */
export function SiteNav(props: { current: 'home' | 'play' | 'docs'; class?: string }) {
  return (
    <nav class={`site-nav ${props.class ?? ''}`} aria-label="Site">
      <A href="/play" aria-current={props.current === 'play' ? 'page' : undefined}>
        Playground
      </A>
      <A href="/docs" aria-current={props.current === 'docs' ? 'page' : undefined}>
        Docs
      </A>
      <a
        class="site-nav-more"
        href={`${import.meta.env.BASE_URL}#examples`}
        onClick={e => {
          // Already on the page: scroll there, even when the hash is already #examples.
          const section = document.getElementById('examples');
          if (props.current !== 'home' || !section) return;
          e.preventDefault();
          history.replaceState(null, '', '#examples');
          section.scrollIntoView({ behavior: 'instant' });
        }}
      >
        Examples
      </a>
      <a class="site-nav-more" href={appUrl()}>
        Editor
      </a>
      <a href={GITHUB} class="site-nav-gh">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0z" />
        </svg>
        <span class="site-nav-label">GitHub</span>
      </a>
    </nav>
  );
}
