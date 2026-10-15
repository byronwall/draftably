/** Group frame metrics shared by the compiler, the projection and the translator. */

/** Space between a group's frame and its content, on the sides and bottom. */
export const GROUP_INSET = 24;
/**
 * Space between a group's top edge and its content in the default theme; the title sits in it.
 * Themes with taller titles reserve more (`ResolvedAppearance.groupHeader`).
 */
export const GROUP_HEADER = 48;

/** Top-left of a group's content area, which its children's local positions are relative to. */
export const contentOrigin = (group: { x: number; y: number }, header = GROUP_HEADER) => ({
  x: group.x + GROUP_INSET,
  y: group.y + header,
});
