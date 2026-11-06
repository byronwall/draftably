import viewerCss from './viewer.css?inline';
import { mountViewer } from './viewer';
import type { UpdateResult, ViewerHandle, ViewerOptions } from './viewer';

export interface DraftDiagramElement extends HTMLElement {
  source: string;
  /** Reflects the `outline` attribute. */
  outline: 'visible' | 'hidden' | undefined;
  options: ViewerOptions;
  readonly viewer?: ViewerHandle;
  readonly updateComplete: Promise<UpdateResult | undefined>;
}

declare global {
  interface HTMLElementTagNameMap {
    'draft-diagram': DraftDiagramElement;
  }
}

const tag = 'draft-diagram';

if (
  typeof globalThis.document !== 'undefined' &&
  typeof globalThis.customElements !== 'undefined'
) {
  if (!customElements.get(tag)) {
    class DraftDiagram extends HTMLElement implements DraftDiagramElement {
      static get observedAttributes() {
        return ['source', 'state', 'label', 'outline'];
      }

      private _options: ViewerOptions = {};
      private _viewer?: ViewerHandle;
      private _updateComplete: Promise<UpdateResult | undefined> = Promise.resolve(undefined);
      private _host!: HTMLDivElement;
      private _fallback!: HTMLSlotElement;
      private _status!: HTMLParagraphElement;
      private _style!: HTMLStyleElement;
      private _generation = 0;
      private _revision = 0;
      private _pendingSource?: string;
      private _pendingOutline?: 'visible' | 'hidden';
      private _hasCommitted = false;

      constructor() {
        super();
        const oldSource = Object.hasOwn(this, 'source')
          ? (this as { source: string }).source
          : undefined;
        const oldOptions = Object.hasOwn(this, 'options')
          ? (this as { options: ViewerOptions }).options
          : undefined;
        const oldOutline = Object.hasOwn(this, 'outline')
          ? (this as Partial<DraftDiagramElement>).outline
          : undefined;
        delete (this as Partial<DraftDiagramElement>).source;
        delete (this as Partial<DraftDiagramElement>).outline;
        delete (this as Partial<DraftDiagramElement>).options;
        this.attachShadow({ mode: 'open' });
        this._style = this.ownerDocument.createElement('style');
        this._style.textContent = `${viewerCss}\n:host{display:block;height:26rem;min-height:16rem;box-sizing:border-box}.draft-diagram__viewer{height:100%;min-height:0}.draft-diagram__viewer[hidden]{display:none}.draft-diagram__fallback{display:block}.draft-diagram__fallback[hidden]{display:none}.draft-diagram__status{margin:.35rem 0;color:#9a3412;font:14px/1.45 system-ui,sans-serif}.draft-diagram__status:empty{display:none}`;
        this._host = this.ownerDocument.createElement('div');
        this._host.className = 'draft-diagram__viewer';
        this._host.hidden = true;
        this._fallback = this.ownerDocument.createElement('slot');
        this._fallback.className = 'draft-diagram__fallback';
        this._status = this.ownerDocument.createElement('p');
        this._status.className = 'draft-diagram__status';
        this._status.setAttribute('role', 'status');
        this._status.setAttribute('aria-live', 'polite');
        this.shadowRoot!.append(this._host, this._fallback, this._status);
        if (oldOptions) this._options = oldOptions;
        if (oldOutline) this._pendingOutline = oldOutline;
        if (oldSource !== undefined) {
          this._pendingSource = String(oldSource ?? '');
        }
      }

      get source() {
        return this.getAttribute('source') ?? '';
      }

      set source(value: string) {
        const source = String(value ?? '');
        if (this.getAttribute('source') !== source) this.setAttribute('source', source);
      }

      get outline() {
        const value = this.getAttribute('outline');
        return value === null ? undefined : value === 'visible' ? 'visible' : 'hidden';
      }

      set outline(value: 'visible' | 'hidden' | undefined) {
        if (value == null) this.removeAttribute('outline');
        else if (this.getAttribute('outline') !== value) this.setAttribute('outline', value);
      }

      get options() {
        return this._options;
      }

      set options(value: ViewerOptions) {
        this._options = value ?? {};
        if (this.isConnected) this._mount(true);
      }

      get viewer() {
        return this._viewer;
      }

      get updateComplete() {
        return this._updateComplete;
      }

      connectedCallback() {
        if (this._pendingOutline) {
          this.outline = this._pendingOutline;
          this._pendingOutline = undefined;
        }
        if (this._pendingSource !== undefined) {
          const source = this._pendingSource;
          this._pendingSource = undefined;
          this.setAttribute('source', source);
        }
        this._mount(false);
      }

      disconnectedCallback() {
        this._reset();
        this._style.remove();
      }

      private _reset() {
        this._generation++;
        this._viewer?.destroy();
        this._viewer = undefined;
        this._host.replaceChildren();
        this._host.hidden = true;
        this._fallback.hidden = false;
        this._status.textContent = '';
        this._hasCommitted = false;
      }

      attributeChangedCallback(name: string) {
        if (name === 'source') {
          if (this.isConnected) {
            if (this._viewer && this.source.trim()) this._update();
            else this._mount(true);
          }
        } else if (this.isConnected && name === 'state') {
          this._update();
        } else if (this.isConnected && (name === 'label' || name === 'outline')) {
          this._mount(true);
        }
      }

      private _mount(remount: boolean) {
        if (!this.isConnected) return;
        if (remount) this._reset();
        if (this._viewer) return;
        const options: ViewerOptions = {
          ...this._options,
          ...(this.hasAttribute('label') ? { label: this.getAttribute('label')! } : {}),
          ...(this.outline ? { outline: this.outline } : {}),
        };
        const nonce = options.render?.styleNonce;
        this._style.remove();
        if (nonce) this._style.setAttribute('nonce', nonce);
        else this._style.removeAttribute('nonce');
        this.shadowRoot!.prepend(this._style);
        if (!this.source.trim()) {
          this._updateComplete = Promise.resolve(undefined);
          return;
        }
        try {
          this._viewer = mountViewer(this._host, options);
        } catch (error) {
          this._mountFailure(error);
          return;
        }
        this._update();
      }

      private _mountFailure(error: unknown) {
        const result: UpdateResult = {
          status: 'error',
          revision: ++this._revision,
          error: {
            ok: false,
            reason: 'environment',
            diagnostics: [
              {
                code: 'DRAFT_ELEMENT_MOUNT',
                severity: 'error',
                message: error instanceof Error ? error.message : 'Diagram viewer could not start.',
                itemIds: [],
              },
            ],
          },
        };
        this._status.textContent = result.error.diagnostics[0].message;
        this._updateComplete = Promise.resolve(result);
        this.dispatchEvent(
          new CustomEvent<UpdateResult>('draft-update', { detail: result, bubbles: true }),
        );
      }

      private _update() {
        const viewer = this._viewer;
        if (!viewer || !this.isConnected) return;
        const generation = ++this._generation;
        this._revision++;
        const complete = viewer.update(this.source, { state: this.getAttribute('state') });
        this._updateComplete = complete.then(result => {
          if (generation !== this._generation || !this.isConnected || viewer !== this._viewer)
            return result;
          if (result?.status === 'committed') {
            const firstCommit = !this._hasCommitted;
            this._hasCommitted = true;
            this._host.hidden = false;
            this._fallback.hidden = true;
            this._status.textContent = '';
            if (firstCommit) viewer.fit();
          } else if (result?.status === 'error') {
            this._status.textContent = this._hasCommitted
              ? ''
              : result.error.diagnostics.map(diagnostic => diagnostic.message).join(' ');
          } else {
            return result;
          }
          this.dispatchEvent(
            new CustomEvent<UpdateResult>('draft-update', { detail: result, bubbles: true }),
          );
          return result;
        });
      }
    }

    customElements.define(tag, DraftDiagram);
  }
}
