// The app's own diagram session, while module-level exports still delegate to it.
import { STORAGE_KEY } from '../lib/saved-diagram';
import { createDiagramSession } from './session';

export const defaultSession = createDiagramSession({
  storageKey: STORAGE_KEY,
  urlState: true,
  confirm: request => void import('./ui').then(ui => ui.confirmAction(request)),
  openLink: href => void import('./links').then(links => links.openLink(href)),
  onInteract: () => void import('./ui').then(ui => ui.closeMenu()),
});
