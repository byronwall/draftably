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
export function registerDispose(dispose: () => void) {
  disposers.push(dispose);
}
export function disposeControllers() {
  for (const dispose of disposers.splice(0)) dispose();
}
