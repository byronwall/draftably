/**
 * `<draft-editor>`: the editor as a custom element, for any framework or plain HTML. Its `source`
 * attribute or property sets the text; every kept edit fires `draft-change` with `{ source }`.
 * It mounts in a microtask after it is added to the page, and stops its session when removed.
 */
import {
  mountFailure,
  redispatch,
  sameValue,
  takeEarly,
  warnOtherCopy,
} from '../runtime/element-base';
import type { DraftStatus } from '../runtime/host';
import { runtimeVersion } from '../runtime/version';
import { mountEditor, type EditorOptions, type MountedEditor } from './mount';

export type { DraftEventMap, HostEventName, HostEvents } from '../runtime/host';
export type { EditorOptions };

export interface DraftEditorElement extends HTMLElement {
  source: string;
  /**
   * Every `mountEditor` option except `source` and `onChange`. Callbacks apply live; a new
   * `storageKey` mounts a new editor. A new object with the same values does nothing.
   */
  options: EditorOptions;
  readonly editor?: MountedEditor;
}

declare global {
  interface HTMLElementTagNameMap {
    'draft-editor': DraftEditorElement;
  }
}

const tag = 'draft-editor';

if (typeof customElements !== 'undefined') {
  if (customElements.get(tag)) warnOtherCopy(tag);
  else
    customElements.define(
      tag,
      class extends HTMLElement implements DraftEditorElement {
        static runtimeVersion = runtimeVersion;
        static observedAttributes = ['source'];
        editor?: MountedEditor;
        private _options: EditorOptions = {};
        private _scheduled = false;
        /** The text last sent to or received from the editor, so an echo is not redrawn. */
        private last = '';

        get source() {
          return this.editor?.source() ?? this.getAttribute('source') ?? '';
        }

        set source(value: string) {
          this.setAttribute('source', String(value ?? ''));
        }

        get options() {
          return this._options;
        }

        set options(value: EditorOptions) {
          const prev = this._options;
          this._options = value ?? {};
          if (this.editor && !sameValue(prev.storageKey, this._options.storageKey)) {
            this._destroy();
            this._schedule();
          }
        }

        constructor() {
          super();
          // A framework may set properties before this class is defined. Such an own property
          // hides the setter, so take its value and remove it.
          const source = takeEarly<string>(this, 'source');
          const options = takeEarly<EditorOptions>(this, 'options');
          if (options) this._options = options;
          if (source !== undefined) this.setAttribute('source', String(source));
        }

        connectedCallback() {
          this._schedule();
        }

        /** Mount once, in a microtask, so every property a framework sets in this tick lands first. */
        private _schedule() {
          if (this._scheduled) return;
          this._scheduled = true;
          queueMicrotask(() => {
            this._scheduled = false;
            if (this.isConnected && !this.editor) this._mount();
          });
        }

        private _setStatus(status: DraftStatus) {
          this.setAttribute('status', status);
        }

        private _mount() {
          this.last = this.getAttribute('source') ?? '';
          this._setStatus('loading');
          // Getters read the latest options, so a new callback applies without a new editor.
          const opts = () => this._options;
          let editor: MountedEditor;
          try {
            editor = mountEditor(this, {
              source: this.last,
              onChange: source => {
                this.last = source;
                redispatch(this, 'change', { source });
              },
              get storageKey() {
                return opts().storageKey;
              },
              get openLink() {
                return opts().openLink;
              },
              get confirm() {
                return opts().confirm;
              },
              get onInteract() {
                return opts().onInteract;
              },
            });
          } catch (error) {
            // Fail as <draft-diagram> does: status, a visible message, and an update event.
            const result = mountFailure(1, error, 'The diagram editor could not start.');
            const message = result.error.diagnostics[0].message;
            this._setStatus('error');
            this.setAttribute('data-error', message);
            redispatch(this, 'update', result);
            return;
          }
          this.editor = editor;
          editor.on('camera', event => redispatch(this, 'camera', event));
          editor.ready.then(
            () => this.editor === editor && this._setStatus('ready'),
            () => this.editor === editor && this._setStatus('error'),
          );
        }

        attributeChangedCallback(_name: string, _old: string | null, value: string | null) {
          if (!this.editor || value === null || value === this.last) return;
          this.last = value;
          void this.editor.update(value);
        }

        private _destroy() {
          this.editor?.destroy();
          this.editor = undefined;
        }

        disconnectedCallback() {
          this._destroy();
          this.removeAttribute('status');
          this.removeAttribute('data-error');
        }
      },
    );
}
