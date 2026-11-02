// src/state/comparison.ts:159-169; body SHA256 28a1cd02b87b8654cbde6a962c3321279aaa03643d3af4f936370cf31f3451b5
function candidateSource(baseline: Diagram, spec: CandidateSpec, config: ComparisonConfig) {
  if (!fileMode()) return null;
  if (config.mode === 'routing')
    return sourceWithRouting(RouteLab.settings({ ...baseline.settings.routing, ...spec.patch }));
  if (config.run !== 'rebuild') return null;
  const scope = sourceScope(config);
  if (!scope)
    throw Error('A layout recipe arranges the whole diagram or one container, not a selection.');
  const settings = LayoutLab.settings({ ...baseline.settings, ...spec.patch, mode: 'rebuild' });
  return sourceWithRecipe(scope, settings).source;
}

// src/state/file-session.ts:578-582; body SHA256 165992b02f8c6fc03b4be9a70461179964ca67f4673be65b8d82b1328f58b6b7
export function sourceWithRouting(routing: RoutingSettings) {
  const source = readSource(localSource);
  setRouting(source, routing);
  return printSource(source);
}

// src/state/file-session.ts:561-565; body SHA256 67c31ec162e42cb4ede28fdb6d24720de48cd829d6b00cc0bf1f7c485346c7ac
export function sourceScope(scope: { scope: string; containerId?: string }): string | null {
  if (scope.scope === 'all') return 'root';
  if (scope.scope === 'container' && scope.containerId) return scope.containerId;
  return null;
}
