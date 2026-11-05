import '@draftably/runtime/element';
import type { DraftDiagramElement } from '@draftably/runtime/element';
import { source } from './diagram';
import './style.css';

const diagram = document.querySelector('draft-diagram')!;
const second = document.querySelector<DraftDiagramElement>('#second')!;
const container = diagram.parentElement!;
const status = document.querySelector('#status')!;
const toggle = document.querySelector<HTMLButtonElement>('#toggle')!;

diagram.addEventListener('draft-update', event => {
  const { status: state } = (event as CustomEvent).detail;
  status.textContent =
    state === 'committed' ? 'Diagram ready.' : 'Source error. Check the diagram message.';
});
diagram.source = source;
second.source = source
  .replace('"Checkout"', '"Independent diagram"')
  .replace('"Orders"', '"Archive"');

document.querySelector('#update')!.addEventListener('click', () => {
  diagram.source = source.replace('"Orders"', '"Archive"');
});
document.querySelector('#invalid')!.addEventListener('click', () => {
  diagram.source = 'not a diagram';
});
toggle.addEventListener('click', () => {
  if (diagram.isConnected) {
    diagram.remove();
    toggle.textContent = 'Add diagram';
    status.textContent = 'Diagram removed.';
  } else {
    diagram.source = source;
    container.append(diagram);
    toggle.textContent = 'Remove diagram';
  }
});
