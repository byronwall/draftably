import logo from '../assets/logo.svg';
import { homeUrl } from '../state/launch';

/** The draftably mark and name, the same way out of the editor as out of any site page. */
export function Brand() {
  return (
    <a class="brand" href={homeUrl()} aria-label="draftably home" title="draftably home">
      <img src={logo} alt="" width="22" height="22" />
      <span class="brand-name">draftably</span>
    </a>
  );
}
