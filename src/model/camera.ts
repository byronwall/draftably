import { clamp } from './geometry';
import type { Rect } from './types';

/** A camera described by the world point at the viewport center and a zoom factor. */
export interface ViewCamera {
  cx: number;
  cy: number;
  k: number;
}

/** Camera that fits `bounds` inside `viewport` with padding, or null for a hidden viewport. */
export function fitCamera(
  bounds: Rect,
  viewport: { width: number; height: number } | undefined,
  padding = 36,
): ViewCamera | null {
  if (!viewport?.width || !viewport?.height) return null;
  const k = Math.min(
    (viewport.width - padding) / Math.max(1, bounds.w),
    (viewport.height - padding) / Math.max(1, bounds.h),
  );
  return { cx: bounds.x + bounds.w / 2, cy: bounds.y + bounds.h / 2, k: clamp(k, 0.015, 2) };
}

/**
 * The zoom factor for one wheel event. A mouse notch (about 100px) zooms by about 18%; a pinch,
 * which arrives as small Ctrl + wheel deltas, keeps its faster rate. `unit` converts line and
 * page deltas to pixels.
 */
export function wheelZoomFactor(e: { deltaY: number; ctrlKey: boolean }, unit = 1) {
  const rate = e.ctrlKey ? 0.01 : 0.002;
  return Math.exp(-clamp(e.deltaY * unit, -120, 120) * rate);
}
