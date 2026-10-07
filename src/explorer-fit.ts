export type FitBounds = { x: number; y: number; w: number; h: number };
export type FitCamera = { cx: number; cy: number; k: number };
export type FitViewport = { width: number; height: number };

export function visibleReadyCells<T extends { status: string }>(
  cells: readonly T[],
  expanded: number | null,
) {
  return cells
    .map((cell, i) => ({ cell, i }))
    .filter(({ cell, i }) => cell.status === 'ready' && (expanded === null || i === expanded));
}

export function fitCamera(
  bounds: FitBounds,
  viewport: FitViewport | null | undefined,
  padding = 36,
): FitCamera | null {
  if (!viewport?.width || !viewport?.height) return null;
  const k = Math.min(
    (viewport.width - padding) / Math.max(1, bounds.w),
    (viewport.height - padding) / Math.max(1, bounds.h),
  );
  return {
    cx: bounds.x + bounds.w / 2,
    cy: bounds.y + bounds.h / 2,
    k: Math.max(0.015, Math.min(2, k)),
  };
}
