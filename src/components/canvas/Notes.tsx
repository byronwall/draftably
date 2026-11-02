import { resolveAppearance } from '../../model/appearance';
import { noteMarkup } from '../../model/note';
import { doc } from '../../state/document';
import { viewerFrame } from '../../state/scene';

/**
 * The file's notes, placed by the frame as `inspect --svg` places them. Not part of the frame
 * group, so the editor's exports copy them with the drawing.
 */
export function Notes() {
  const markup = () => noteMarkup(resolveAppearance(doc.appearance), viewerFrame().notes);
  // The markup escapes its text, as in exports.
  // eslint-disable-next-line solid/no-innerhtml
  return <g class="diagram-notes" pointer-events="none" innerHTML={markup()} />;
}
