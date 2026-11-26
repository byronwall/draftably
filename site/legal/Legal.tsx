import { marked } from 'marked';
import { onMount } from 'solid-js';
import { Footer, Nav } from '../landing/Landing';
import privacy from './privacy.md?raw';
import terms from './terms.md?raw';

const PAGES = { terms, privacy };

/** The Terms and Privacy pages: plain Markdown in the site's reading column. */
export function Legal(props: { page: keyof typeof PAGES }) {
  const md = () => PAGES[props.page];
  onMount(() => (document.title = `${/^# (.*)$/m.exec(md())![1]} · draftably`));
  return (
    <div class="page">
      <Nav />
      <main id="main" class="legal">
        <article
          class="doc"
          // Our own Markdown, from files in this folder. Site links get the site's base path.
          // eslint-disable-next-line solid/no-innerhtml
          innerHTML={marked
            .parse(md(), { async: false })
            .replaceAll('href="/', `href="${import.meta.env.BASE_URL}`)}
        />
      </main>
      <Footer />
    </div>
  );
}
