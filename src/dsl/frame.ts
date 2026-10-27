/** Group frame metrics shared by the compiler, the projection and the translator. */

/** Space between a group's frame and its content, on the sides and bottom. */
export const GROUP_INSET = 24;
/**
 * Space between a group's top edge and its content in the default theme; the title sits in it.
 * Themes with taller titles reserve more (`ResolvedAppearance.groupHeader`).
 */
export const GROUP_HEADER = 48;
/**
 * Horizontal room a group title needs besides its text: the icon and gap before it (33) and the
 * frame controls after it (64), as `GroupView` and the SVG export truncate titles.
 */
export const GROUP_TITLE_CHROME = 33 + 64;

/** Room a soft group's tint leaves round its members, and above them for its label. */
export const SOFT_PAD = 10;
export const SOFT_LABEL = 18;
/** Where a soft group's label sits in its tint: in the annotation face, at the top left. */
export const SOFT_TITLE = { x: SOFT_PAD, y: SOFT_PAD + 2 };
/** Corner radius of each rectangle of a tint; small, so joined rectangles read as one shape. */
export const SOFT_RADIUS = 6;

/** Top-left of a group's content area, which its children's local positions are relative to. */
export const contentOrigin = (group: { x: number; y: number }, header = GROUP_HEADER) => ({
  x: group.x + GROUP_INSET,
  y: group.y + header,
});
