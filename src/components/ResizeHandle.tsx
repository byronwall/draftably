import { tip } from './controls';

const STEP = 16;

/**
 * The strip on a panel's inner edge. Drag it, use the arrow keys when focused, or double-click to
 * go back to the usual width. The width is remembered per browser.
 */
export function ResizeHandle(props: {
  edge: 'left' | 'right';
  label: string;
  width: number;
  onResize: (width: number) => void;
  onReset: () => void;
}) {
  const sign = () => (props.edge === 'right' ? 1 : -1);

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    const startX = e.clientX,
      startWidth = props.width;
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('dragging');
    const move = (ev: PointerEvent) => props.onResize(startWidth + sign() * (ev.clientX - startX));
    const stop = () => {
      handle.classList.remove('dragging');
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  };

  return (
    <div
      class={`resize-handle ${props.edge}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={props.label}
      aria-valuenow={Math.round(props.width)}
      tabindex="0"
      {...tip(props.label, undefined, 'Drag to resize. Double-click to reset.')}
      onPointerDown={onPointerDown}
      onDblClick={() => props.onReset()}
      onKeyDown={e => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        e.stopPropagation();
        props.onResize(props.width + (e.key === 'ArrowRight' ? STEP : -STEP) * sign());
      }}
    />
  );
}
