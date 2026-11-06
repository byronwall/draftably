import { mountViewer } from '@draftably/runtime/viewer';
import '@draftably/runtime/viewer.css';
import './style.css';

const source = `diagram "Checkout" version=1
node web "Web app"
node api "API"
node db "Orders"
edge request web -> api "request"
edge query api -> db "query"
`;
const host = document.querySelector<HTMLElement>('#diagram');
if (!host) throw new Error('Missing #diagram host.');
const viewer = mountViewer(host, { label: 'Checkout flow' });
void viewer.update(source).then(result => {
  if (result.status === 'committed')
    document.querySelector<HTMLImageElement>('#fallback')!.hidden = true;
  else if (result.status === 'error') console.error(result.error.diagnostics);
});
window.addEventListener(
  'pagehide',
  () => {
    viewer.destroy();
    document.querySelector<HTMLImageElement>('#fallback')!.hidden = false;
  },
  { once: true },
);
