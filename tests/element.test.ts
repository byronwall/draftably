// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../src/runtime/element';

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  value: ResizeObserverMock,
  configurable: true,
});

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('draft-diagram element', () => {
  it('reflects source, keeps fallback until commit, emits current updates, and reconnects', async () => {
    const element = document.createElement('draft-diagram');
    const fallback = document.createElement('p');
    fallback.textContent = 'Diagram fallback';
    element.append(fallback);
    element.options = { execution: { mode: 'main' } };

    let detail: CustomEvent['detail'];
    element.addEventListener('draft-update', event => {
      detail = (event as CustomEvent).detail;
    });
    element.source = 'not a diagram';
    expect(element.getAttribute('source')).toBe('not a diagram');
    document.body.append(element);
    await element.updateComplete;
    expect(detail).toMatchObject({ status: 'error' });
    expect(element.shadowRoot!.querySelector('slot')!.hidden).toBe(false);
    expect(element.shadowRoot!.querySelector<HTMLElement>('.draft-diagram__viewer')!.hidden).toBe(
      true,
    );
    expect(element.shadowRoot!.querySelector('.draft-diagram__status')!.textContent).toContain(
      'Unknown statement',
    );

    element.source = 'still not a diagram';
    const firstViewer = element.viewer;
    await element.updateComplete;
    expect(detail).toMatchObject({ status: 'error' });
    expect(element.shadowRoot!.querySelector('slot')!.hidden).toBe(false);

    element.source = 'pending invalid update';
    const completion = element.updateComplete;
    element.remove();
    await expect(completion).resolves.toMatchObject({ status: 'destroyed' });
    expect(element.viewer).toBeUndefined();
    expect(element.shadowRoot!.querySelector('slot')!.hidden).toBe(false);
    document.body.append(element);
    await element.updateComplete;
    expect(element.viewer).not.toBe(firstViewer);
    expect(detail).toMatchObject({ status: 'error' });
  });

  it('settles mount failures and applies the nonce before adding the stylesheet', async () => {
    const element = document.createElement('draft-diagram');
    element.source = 'not a diagram';
    element.options = {
      execution: { mode: 'worker' },
      render: {
        styleNonce: 'nonce-123',
        links: { mode: 'safe', resolve: () => null },
      },
    };
    let detail: unknown;
    element.addEventListener('draft-update', event => {
      detail = (event as CustomEvent).detail;
    });
    const root = element.shadowRoot!;
    const prepend = vi.spyOn(root, 'prepend').mockImplementation((...nodes) => {
      const style = nodes.find(node => node instanceof HTMLStyleElement) as HTMLStyleElement;
      expect(style).toBeInstanceOf(HTMLStyleElement);
      expect(style.getAttribute('nonce')).toBe('nonce-123');
      ShadowRoot.prototype.prepend.apply(root, nodes);
    });
    document.body.append(element);

    await expect(element.updateComplete).resolves.toMatchObject({
      status: 'error',
      error: { reason: 'environment', diagnostics: [{ code: 'DRAFT_ELEMENT_MOUNT' }] },
    });
    expect(detail).toMatchObject({ status: 'error' });
    expect(element.shadowRoot!.querySelector('style')!.getAttribute('nonce')).toBe('nonce-123');
    expect(prepend).toHaveBeenCalledOnce();
    expect(element.shadowRoot!.querySelector('slot')!.hidden).toBe(false);
    expect(element.shadowRoot!.querySelector<HTMLElement>('.draft-diagram__viewer')!.hidden).toBe(
      true,
    );
  });
});
