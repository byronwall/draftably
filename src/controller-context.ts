export interface ExplorerController {
  openExplorer(mode?: string): void;
  explorerDiagnostics(): unknown;
  generateExplorer(config?: unknown): Promise<unknown>;
  applyExplorerCandidate(index: number): void;
  closeExplorer(): void;
  exportExplorerSheet(download?: boolean): string;
  getExplorerExperiment(): unknown;
  exSetPresentation(mode: string): void;
  exChooseAnchor(id: string): void;
  dispose(): void;
}

export interface SculptController {
  isJourneyOpen(): boolean;
  hasActiveStroke(): boolean;
  openJourney(options?: unknown): Promise<unknown>;
  closeJourney(): void;
  journeyScrub(index: number): void;
  journeyKeep(options?: unknown): void;
  journeyBookmark(): void;
  brushActivate(options?: unknown): void;
  brushApplyAt(options?: unknown): unknown;
  sculptCheckDocument(): void;
  sculptBeforeEdit(): void;
  sculptUndo(): boolean;
  sculptHistory(entry: unknown, direction: string): void;
  sculptFixedIds(): string[];
  sculptOverlay(): string;
  sculptLockControls(locked: boolean): void;
  sculptToolChange(tool: string): boolean;
  sculptPointerDown(event: PointerEvent): boolean;
  sculptPointerMove(event: PointerEvent): boolean;
  sculptPointerUp(event: PointerEvent): boolean;
  sculptCancelStroke(): void;
  sculptInteracting(): boolean;
  sculptImportJourney(input: unknown): unknown;
  sculptAction(name: string, element: Element): Promise<boolean>;
  sculptKey(event: KeyboardEvent): boolean;
  sculptBlur(): void;
  sculptBeforeUnload(): void;
  sculptDiagnostics(): unknown;
  sculptExportJourney(): unknown;
  sculptClearHolds(): void;
  dispose(): void;
}

export const controllers: {
  explorer: Partial<ExplorerController>;
  sculpt: Partial<SculptController>;
} = { explorer: {}, sculpt: {} };

const disposers: Array<() => void> = [];
const events = new AbortController();
const timers = new Map<number, () => void>();

export function listen(
  target: EventTarget,
  type: string,
  handler: EventListenerOrEventListenerObject,
  options: AddEventListenerOptions | boolean = {},
) {
  const opts = typeof options === 'boolean' ? { capture: options } : options;
  const localSignal = opts.signal;
  const { signal: _signal, ...rest } = opts;
  const remove = () => target.removeEventListener(type, handler, rest);
  target.addEventListener(type, handler, { ...rest, signal: events.signal });
  if (localSignal) {
    if (localSignal.aborted) remove();
    else {
      localSignal.addEventListener('abort', remove, { once: true });
      events.signal.addEventListener('abort', () => localSignal.removeEventListener('abort', remove), { once: true });
    }
  }
  return remove;
}

export function registerDispose(dispose: () => void) {
  disposers.push(dispose);
}
export function later(callback: () => void, delay: number) {
  const id = window.setTimeout(() => {
    timers.delete(id);
    callback();
  }, delay);
  timers.set(id, () => window.clearTimeout(id));
  return id;
}
export function every(callback: () => void, delay: number) {
  const id = window.setInterval(callback, delay);
  timers.set(id, () => window.clearInterval(id));
  return id;
}
export function clearTimer(id: number) {
  const clear = timers.get(id);
  if (clear) {
    clear();
    timers.delete(id);
  } else {
    window.clearTimeout(id);
    window.clearInterval(id);
  }
}
export function disposeControllers() {
  events.abort();
  for (const clear of timers.values()) clear();
  timers.clear();
  for (const dispose of disposers.splice(0)) dispose();
}
