import { ICONS } from '../model/icons';

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
