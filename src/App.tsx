import { onCleanup } from 'solid-js';
import { disposeControllers } from './controller-context';

const tools = [
  ['select', 'cursor', 'Edit / select · V'], ['pan', 'hand', 'Navigate · H'],
  ['box', 'box', 'Rectangle · R'], ['diamond', 'diamond', 'Diamond · D'],
  ['circle', 'circle', 'Ellipse · O'], ['text', 'text', 'Text · T'],
  ['container', 'group', 'Container · G'], ['connect', 'connect', 'Connect · C'],
] as const;

function Toolbar() {
  return (
<header class="topbar">
        <button aria-label="File and examples" class="icon ghost" data-action="file-menu" data-icon="more" id="file-menu-btn" title="File and examples" />
        <div class="title-block"><input aria-label="Diagram title" id="document-title" spellcheck={false} value=""/><span aria-live="polite" id="save-status">Saved</span></div>
        <div aria-label="Drawing tools" class="toolbelt" role="toolbar">
          <span class="sep"/>
          {tools.slice(0, 2).map(([tool, icon, label]) => <button aria-label={label} class="icon ghost" data-icon={icon} data-tool={tool} title={label} />)}
          <span class="sep"/>
          {tools.slice(2).map(([tool, icon, label]) => <button aria-label={label} class="icon ghost" data-icon={icon} data-tool={tool} title={label} />)}
          <span class="sep"/>
          <button aria-label="Undo" class="icon ghost" data-action="undo" data-icon="undo" id="undo-btn" title="Undo · Ctrl/⌘ Z" />
          <button aria-label="Redo" class="icon ghost" data-action="redo" data-icon="redo" id="redo-btn" title="Redo · Ctrl/⌘ Shift Z" />
          <button class="ghost edit-menu" data-action="edit-menu" id="edit-menu-btn" title="Duplicate, group, align, pin, delete">Edit<span data-icon="chevron"/></button>
        </div>
        <button aria-label="Build from a list (B)" class="icon ghost" data-action="quick-build" data-icon="layers" title="Build from a list · B" />
        <select aria-label="Quick layout approach" id="algorithm-quick"><optgroup label="Nested systems"><option value="compound-flow">Compound flow</option><option value="boundary-align">Boundary alignment</option><option value="compound-spring">Compound spring</option></optgroup><option value="tidy">Local tidy</option><option value="stress">Stress descent</option><option value="force">Spring network</option><option value="flow">Directional flow</option><option value="layered">Layered + fold</option><option value="tree">Subtree tree</option><option value="grid">Soft grid</option><option value="separate">Separate overlaps</option></select>
        <div class="layout-split"><button class="primary" data-action="layout" id="layout-btn" title="Improve layout · L"><span data-icon="layout"/><span class="layout-label">Improve</span><kbd>L</kbd></button><button aria-label="Layout options" class="primary icon" data-action="layout-menu" data-icon="chevron" id="layout-options-btn" title="Layout options · Alt L"/></div>
        <button class="ghost sculpt-launch" data-action="journey-open" id="journey-btn" title="Layout timeline · Alt T"><span data-icon="journey"/><span>Timeline</span></button>
        <button aria-label="Layout brush (W)" class="icon ghost" data-action="brush-toggle" data-icon="brush" id="brush-btn" title="Layout brush · W"/>
        <button class="ghost" data-action="compare-layouts" id="compare-btn" title="Compare layouts and routing parameters · Alt E"><span aria-hidden="true" class="ex-compare-icon"><i/><i/><i/><i/></span><span class="compare-label">Compare</span></button>
        <div class="route-split"><button aria-label="Reroute connections" class="ghost icon" data-action="reroute" data-icon="branch" title="Reroute only · Alt R"/><button aria-label="Routing options" class="ghost icon" data-action="routing-menu" data-icon="chevron" id="routing-options-btn"/></div>
        <div class="top-actions"><button aria-label="Toggle objects" class="icon ghost" data-action="toggle-left" data-icon="panel-left" title="Objects · ["/><button aria-label="Toggle inspector" class="icon ghost" data-action="toggle-right" data-icon="panel-right" title="Inspector · ]"/><button aria-label="Keyboard shortcuts" class="icon ghost help-button" data-action="help" data-icon="help" title="Keyboard shortcuts · ?"/><button class="ghost" data-action="export-menu" id="export-btn"><span data-icon="export"/><span class="export-label">Export</span></button></div>
        <button class="ghost danger" data-action="layout-cancel" hidden id="layout-cancel">Cancel</button>
      </header>
  );
}
function ObjectsPanel() {
  return (
<aside aria-label="Objects" class="panel left-panel" hidden id="objects-panel"><div class="panel-head"><h2>Objects <span class="pill" id="layer-count"/></h2><button aria-label="Close objects" class="icon ghost" data-action="toggle-left" data-icon="close"/></div><div class="object-search"><input aria-label="Find an object" id="layer-search" placeholder="Find an object…"/></div><div class="layer-list panel-scroll" id="layer-list"/></aside>
  );
}
function CanvasStage() {
  return (
<main aria-label="Diagram workspace" data-tool="select" id="stage">
          <svg aria-label="Diagram canvas. N adds a box. Enter edits. C connects. Drag nodes to edit; drag background to pan. Escape returns to Edit. Shift drag selects. Two-finger scroll pans; pinch zooms. Question mark opens shortcuts." id="canvas" role="application" tabindex="0"><defs><pattern height="24" id="dots" patternUnits="userSpaceOnUse" width="24"><circle cx="1" cy="1" fill="var(--dot)" r=".7"/></pattern></defs><rect fill="url(#dots)" height="100%" id="grid-bg" width="100%"/><g id="world"><g id="group-layer"/><g id="edge-layer"/><g id="node-layer"/><g id="overlay-layer"/></g></svg>
          <div class="empty-canvas" hidden id="empty-canvas"><h2>Draw something.</h2><p><kbd>N</kbd> adds a box. Type a title, then <kbd>Tab</kbd> to keep going.</p><button class="primary" data-action="quick-build">Build from a list <kbd>B</kbd></button></div>
          <div class="zoom-controls"><button aria-label="Fit diagram" class="icon ghost" data-action="fit" data-icon="fit" title="Fit diagram · 1"/><span class="sep"/><button aria-label="Zoom out" class="icon ghost" data-action="zoom-out" data-icon="minus"/><button class="ghost" data-action="reset-camera" id="zoom-label">100%</button><button aria-label="Zoom in" class="icon ghost" data-action="zoom-in" data-icon="plus"/></div>
          <section id="journey-deck" class="journey-deck" aria-label="Layout timeline" hidden/><section id="brush-dock" class="brush-dock" aria-label="Layout brush controls" hidden/><div class="image-drop" hidden id="drop-overlay">Drop an image or a saved diagram</div>
        </main>
  );
}
function InspectorPanel() {
  return (
<aside aria-label="Inspector" class="panel right-panel" hidden id="inspector-panel"><div class="panel-head"><h2>Inspector</h2><button aria-label="Close inspector" class="icon ghost" data-action="toggle-right" data-icon="close"/></div><div class="panel-scroll" id="inspector"/><div class="inspector-bottom"><span>Toggle panels</span><kbd>\</kbd></div></aside>
  );
}
function ComparisonDialog() {
  return (
<dialog aria-labelledby="ex-title" id="explorer-dialog">
      <header class="ex-header"><button class="ghost icon" data-ex-action="toggle-controls" aria-label="Toggle comparison controls">☰</button><div class="ex-heading"><h2 id="ex-title">Compare layouts</h2><p id="ex-source"/></div><div class="ex-presentation" role="group" aria-label="Comparison display"><button data-ex-view="grid" aria-pressed="true">Grid</button><button data-ex-view="overlay" aria-pressed="false">Overlay</button></div><span class="grow"/><span class="ex-readonly">Preview only · Apply to keep</span><button aria-label="Close comparison" class="ghost ex-close" data-ex-action="close">Close <kbd>Esc</kbd></button></header>
      <aside id="ex-sidebar" class="ex-sidebar" aria-label="Comparison settings"><div class="ex-sidebar-scroll"><nav aria-label="Comparison type" class="ex-tabs" id="ex-tabs"/><div class="ex-config" id="ex-config"/><div id="ex-intent"/><section class="ex-control-section"><h3>Inspect</h3><div class="ex-camera-controls" id="ex-camera-controls"/><p class="ex-camera-note" id="ex-camera-note"/></section><div id="ex-layer-controls"/><details class="ex-control-section"><summary>Export comparison</summary><div class="ex-export-actions"><button data-ex-action="export-svg">Save visible format as SVG</button><button data-ex-action="export-json">Save experiment JSON</button></div><p class="note">The experiment includes the baseline and full candidate documents.</p></details></div></aside>
      <main class="ex-main" aria-label="Candidate diagrams"><div class="ex-main-bar"><span id="ex-anchor-label">Click any shape to choose a visual anchor.</span><span class="grow"/><button class="ghost small" data-ex-action="fit">Fit all <kbd>Home</kbd></button></div><div aria-label="Comparison contact sheet" class="ex-grid" id="ex-grid"/><div id="ex-overlay-stage" hidden><svg class="ex-canvas ex-overlay-canvas" data-ex-canvas="-1" tabindex="0" role="application" aria-label="Anchored overlay. Click a shape to align every layer on it. Drag to pan. Pinch to zoom."><g data-ex-world/></svg><span class="ex-scale" data-ex-scale="-1"/><div class="ex-overlay-empty">Generate layouts to compare their geometry.</div></div><div aria-live="polite" class="ex-progress" id="ex-progress" role="status"/></main>
    </dialog>
  );
}

export default function App() {
  onCleanup(disposeControllers);
  return <>
    <div class="right-closed" id="app">
      <Toolbar />
      <div class="workspace left-closed" id="workspace">
        <ObjectsPanel />
        <CanvasStage />
      </div>
      <InspectorPanel />
      <footer class="statusbar"><span id="item-status"/><span class="status-hint" id="mode-status"/><span class="status-right" id="engine-status"/><button class="ghost" data-action="help" title="Keyboard shortcuts">?</button></footer>
    </div>
    <aside aria-label="Layout lab" class="layout-lab" hidden id="layout-lab"/>
    <div class="layout-preview" hidden id="layout-preview"><div><strong id="preview-name">Layout preview</strong><span>Not saved yet</span></div><button aria-label="Hold to see previous layout" id="preview-before" title="Hold to compare">Hold before</button><button data-action="layout-discard">Discard <kbd>Esc</kbd></button><button class="primary" data-action="layout-accept">Keep layout</button></div>
    <ComparisonDialog />
    <div aria-live="polite" id="toast" role="status"/><div class="popover" hidden id="popover"/>
    <dialog aria-labelledby="dialog-title" id="main-dialog"><div class="dialog-head"><h2 id="dialog-title"/><button aria-label="Close dialog" class="icon ghost" data-action="close-dialog" data-icon="close"/></div><div class="dialog-body" id="dialog-body"/><div class="dialog-foot" id="dialog-foot"/></dialog>
    <input accept=".json,.svg,image/png,image/jpeg,image/webp,image/gif" hidden id="file-input" type="file"/><input accept="image/png,image/jpeg,image/webp,image/gif" hidden id="image-input" multiple type="file"/>
  </>;
}
