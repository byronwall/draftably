/** Group frame metrics shared by the compiler, the projection and the translator. */

/** Space between a group's frame and its content, on the sides and bottom. */
export const GROUP_INSET = 24;
/** Space between a group's top edge and its content; the title sits in it. */
export const GROUP_HEADER = 48;

/** Top-left of a group's content area, which its children's local positions are relative to. */
export const contentOrigin = (group: { x: number; y: number }) => ({
  x: group.x + GROUP_INSET,
  y: group.y + GROUP_HEADER,
});
