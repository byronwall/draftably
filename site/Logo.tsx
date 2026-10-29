import logo from '../src/assets/logo.svg?raw';

/** The Draftably mark, inline so it is sharp at any size and needs no request. */
export function Logo(props: { size?: number }) {
  return (
    <span
      class="logo"
      style={{ width: `${props.size ?? 22}px`, height: `${props.size ?? 22}px` }}
      aria-hidden="true"
      // The file is ours: src/assets/logo.svg.
      // eslint-disable-next-line solid/no-innerhtml
      innerHTML={logo}
    />
  );
}
