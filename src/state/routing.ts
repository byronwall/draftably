/** Router settings: the named presets and the undoable edit that changes how lines are drawn. */
import { RouteLab } from '../engines/routing-engine.js';
import type { RoutingSettings } from '../model/types';
import { commit, doc, setDoc, snapshot } from './document';
import { commitSource, fileBlocked, fileMode, sourceWithRouting } from './file-session';
import { layoutPreview, previewRouting } from './layout';
import { resetRoutes } from './scene';
import { toast } from './toast';

export const ROUTE_PRESETS = {
  Balanced: {},
  'Fewer crossings': { crossingPenalty: 900, sharedPenalty: 9, portStability: 10 },
} satisfies Record<string, Partial<RoutingSettings>>;

export type RoutePreset = keyof typeof ROUTE_PRESETS;

/** Routing settings are undoable edits: they change how every connection is drawn. */
export function setRouting(patch: Partial<RoutingSettings>, label: string) {
  const next = RouteLab.settings({ ...doc.settings.routing, ...patch });
  // A diagram file stores router settings in its `routing` line.
  if (fileMode()) {
    const blocked = fileBlocked();
    if (blocked) return toast(blocked);
    if (layoutPreview()) return void previewRouting(next);
    void commitSource(sourceWithRouting(next), label, 'routing');
    return;
  }
  const before = snapshot();
  setDoc('settings', 'routing', next);
  resetRoutes();
  commit(before, label);
}

/** Corner rounding is how lines look, not where they go, so a preset leaves it alone. */
const presetSettings = (preset: RoutePreset): RoutingSettings => ({
  ...RouteLab.defaults,
  ...ROUTE_PRESETS[preset],
  cornerRadius: doc.settings.routing.cornerRadius,
});

/** A file previews a preset, like a direction or format. A browser diagram's edit is undoable. */
export function applyRoutePreset(preset: RoutePreset) {
  if (!fileMode()) return setRouting(presetSettings(preset), 'Change routing preset');
  const blocked = fileBlocked();
  if (blocked) return toast(blocked);
  void previewRouting(presetSettings(preset));
}

/** The preset the current settings match, or null for custom values. */
export function activeRoutePreset() {
  const current = doc.settings.routing;
  return (
    (Object.keys(ROUTE_PRESETS) as RoutePreset[]).find(preset =>
      (Object.entries(presetSettings(preset)) as Array<[keyof RoutingSettings, number]>).every(
        ([key, value]) => current[key] === value,
      ),
    ) ?? null
  );
}
