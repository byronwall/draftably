import { resolveAppearance } from '../../model/appearance';
import { noteMarkup } from '../../model/note';
import { doc } from '../../state/document';
import { exportHref } from '../../state/links';
import { viewerFrame } from '../../state/scene';

/**
 * The file's notes, placed by the frame as `inspect --svg` places them. Not part of the frame
 * group, so the editor's exports copy them with the drawing.
 */
export function Notes() {
  // Links are written as exports write them, since exports copy these notes.
  const markup = () =>
    noteMarkup(resolveAppearance(doc.appearance), viewerFrame().notes, exportHref);
  // The markup escapes its text, as in exports.
  // eslint-disable-next-line solid/no-innerhtml
  return <g class="diagram-notes" pointer-events="none" innerHTML={markup()} />;
}
