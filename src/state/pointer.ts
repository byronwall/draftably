// Delegates to the default session until every caller reads a session of its own.
import { defaultSession } from './default-session';

export * from './session/pointer';
export const {
  isDragging,
  cancelGesture,
  resetModifiers,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  selectForContextMenu,
  dragKind,
} = defaultSession;
