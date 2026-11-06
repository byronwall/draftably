import { mountViewer } from '@draftably/runtime/viewer';
import '@draftably/runtime/viewer.css';
import './style.css';

const firstHost = document.querySelector<HTMLElement>('#first')!;
const secondHost = document.querySelector<HTMLElement>('#second')!;
const hiddenHost = document.querySelector<HTMLElement>('#hidden')!;
const first = mountViewer(firstHost, {
  label: 'First diagram',
  render: { links: { mode: 'safe' } },
});
const second = mountViewer(secondHost, { label: 'Second diagram', outline: 'visible' });
const hidden = mountViewer(hiddenHost, { label: 'Hidden diagram' });
const source = `diagram "Browser proof" version=1
node api "API" href="https://example.com/api"
node store "Store"
edge request api -> store "reads"
`;
const other = source.replace('"Store"', '"Archive"');
type ViewerHandle = ReturnType<typeof mountViewer>;
type ViewerResult = Awaited<ReturnType<ViewerHandle['update']>>;
declare global {
  interface Window {
    viewerProof: {
      first: ViewerHandle;
      second: ViewerHandle;
      hidden: ViewerHandle;
      source: string;
      other: string;
      initialResults: ViewerResult[] | null;
      linkWasPrevented(): boolean;
      update(text: string): Promise<ViewerResult>;
      updateHidden(): Promise<ViewerResult>;
      revealHidden(): void;
      remountAfterDestroy(): Promise<{ result: ViewerResult; committed: ViewerResult }>;
      dispose(): void;
    };
  }
}
let prevented = false;
first.on('link', event => {
  prevented = true;
  event.preventDefault();
});

window.viewerProof = {
  first,
  second,
  hidden,
  source,
  other,
  initialResults: null,
  linkWasPrevented: () => prevented,
  update: (text: string) => first.update(text),
  updateHidden: () => hidden.update(other),
  revealHidden: () => {
    hiddenHost.hidden = false;
  },
  remountAfterDestroy: async () => {
    const pending = first.update(source);
    first.destroy();
    const result = await pending;
    document.querySelector<HTMLImageElement>('#static-fallback')!.hidden = false;
    const remounted = mountViewer(firstHost, { label: 'Remounted diagram' });
    const committed = await remounted.update(source);
    return { result, committed, remounted };
  },
  dispose: () => {
    first.destroy();
    second.destroy();
    hidden.destroy();
    document.querySelector<HTMLImageElement>('#static-fallback')!.hidden = false;
  },
};

void Promise.all([first.update(source), second.update(source), hidden.update(source)]).then(
  results => {
    window.viewerProof.initialResults = results;
    const committed = results.every(result => result.status === 'committed');
    if (committed) document.querySelector<HTMLImageElement>('#static-fallback')!.hidden = true;
    document.querySelector('#proof-status')!.textContent = committed
      ? 'Rendered with the packed viewer.'
      : `Initial render failed: ${results.map(result => result.status).join(', ')}`;
  },
);
