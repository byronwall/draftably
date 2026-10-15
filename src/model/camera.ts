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
