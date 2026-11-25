import { ICONS } from '../model/icons';
import { iconAt, type IconData } from '../model/iconify';

/** A 24×24 stroke icon for the interface. */
export function Icon(props: { name: string; class?: string; size?: number }) {
  return (
    <svg
      class={props.class ?? 'icon'}
      viewBox="0 0 24 24"
      width={props.size}
      height={props.size}
      aria-hidden="true"
      // Icon markup comes from the fixed ICONS table, never from user input.
      // eslint-disable-next-line solid/no-innerhtml
      innerHTML={ICONS[props.name] ?? ICONS.cube}
    />
  );
}

/** The same icon drawn inside an SVG scene at a given position. */
export function SceneGlyph(props: {
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
}) {
  return (
    <svg
      x={props.x}
      y={props.y}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={props.color}
      stroke-width="1.65"
      stroke-linecap="round"
      stroke-linejoin="round"
      pointer-events="none"
      // Icon markup comes from the fixed ICONS table, never from user input.
      // eslint-disable-next-line solid/no-innerhtml
      innerHTML={ICONS[props.name] ?? ICONS.cube}
    />
  );
}

/**
 * A file's `icon=` drawn in the scene, from the data the compiler put on the diagram. The markup
 * is the same `iconAt` writes into exported SVG, so the canvas and exports match.
 */
export function DiagramIcon(props: {
  icons: Record<string, IconData> | undefined;
  name: string;
  x: number;
  y: number;
  size: number;
  ink: string;
  uid: string;
}) {
  return (
    <g
      pointer-events="none"
      // Icon bodies come from the installed icon sets the compiler read, never from the file.
      // eslint-disable-next-line solid/no-innerhtml
      innerHTML={iconAt(
        props.icons,
        props.name,
        props.x,
        props.y,
        props.size,
        props.ink,
        props.uid,
      )}
    />
  );
}
