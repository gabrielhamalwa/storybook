/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RenderContext } from 'storybook/internal/types';

import { renderToCanvas } from './render.ts';
import type { SymfonyRenderer } from './types.ts';

const createMockContext = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'button--primary',
    title: 'Button',
    name: 'Primary',
    showMain: vi.fn(),
    showError: vi.fn(),
    storyFn: vi.fn().mockReturnValue({ componentId: 'Button' }),
    storyContext: {
      args: { label: 'Click me' },
      parameters: {},
    },
    ...overrides,
  }) as unknown as RenderContext<SymfonyRenderer>;

describe('renderToCanvas', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="canvas"></div>';
    import.meta.env.STORYBOOK_SYMFONY_URL = 'http://localhost:8000';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    delete import.meta.env.STORYBOOK_SYMFONY_URL;
  });

  it('renders HTML returned by the Symfony render endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          html: '<button class="btn">Click me</button>',
          assets: { styles: [], scripts: [] },
        }),
      } as unknown as Response)
    );

    const canvas = document.getElementById('canvas') as HTMLDivElement;
    const context = createMockContext();

    await renderToCanvas(context, canvas);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/_storybook/render/button--primary',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentId: 'Button', args: { label: 'Click me' } }),
      }
    );
    expect(canvas.innerHTML).toBe('<button class="btn">Click me</button>');
    expect(context.showMain).toHaveBeenCalled();
  });

  it('sends adapter and template overrides to the render endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          html: '<div class="alert">Hello</div>',
          assets: { styles: [], scripts: [] },
        }),
      } as unknown as Response)
    );

    const canvas = document.getElementById('canvas') as HTMLDivElement;
    const context = createMockContext({
      storyContext: {
        args: { message: 'Hello' },
        parameters: {
          symfony: {
            adapter: 'template',
            template: 'templates/components/Alert.html.twig',
          },
        },
      },
    });

    await renderToCanvas(context, canvas);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/_storybook/render/button--primary',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentId: 'Button',
          args: { message: 'Hello' },
          adapter: 'template',
          template: 'templates/components/Alert.html.twig',
        }),
      }
    );
  });

  it('sends controller override to the render endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          html: '<div class="alert">Controller</div>',
          assets: { styles: [], scripts: [] },
        }),
      } as unknown as Response)
    );

    const canvas = document.getElementById('canvas') as HTMLDivElement;
    const context = createMockContext({
      storyContext: {
        args: { message: 'Hello' },
        parameters: {
          symfony: {
            adapter: 'controller',
            controller: 'App\\Controller\\AlertController::fragment',
          },
        },
      },
    });

    await renderToCanvas(context, canvas);

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/_storybook/render/button--primary',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentId: 'Button',
          args: { message: 'Hello' },
          adapter: 'controller',
          controller: 'App\\Controller\\AlertController::fragment',
        }),
      }
    );
  });

  it('injects returned assets and removes them on teardown', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          html: '<div class="component">Hello</div>',
          assets: {
            styles: [{ url: 'data:text/css,' }],
            scripts: [{ url: 'data:text/javascript,', type: 'module' }],
          },
        }),
      } as unknown as Response)
    );

    const canvas = document.getElementById('canvas') as HTMLDivElement;
    const teardown = await renderToCanvas(createMockContext(), canvas);

    expect(document.querySelector('link[href="data:text/css,"]')).not.toBeNull();
    expect(
      document.querySelector('script[src="data:text/javascript,"][type="module"]')
    ).not.toBeNull();

    teardown?.();

    expect(document.querySelector('link[href="data:text/css,"]')).toBeNull();
    expect(document.querySelector('script[src="data:text/javascript,"][type="module"]')).toBeNull();
  });

  it('shows an error when the Symfony component ID is missing', async () => {
    const canvas = document.getElementById('canvas') as HTMLDivElement;
    const context = createMockContext({
      storyFn: vi.fn().mockReturnValue({ componentId: undefined }),
    });

    await renderToCanvas(context, canvas);

    expect(context.showError).toHaveBeenCalled();
    expect(context.showMain).not.toHaveBeenCalled();
  });

  it('shows an error when the Symfony server URL is missing', async () => {
    delete import.meta.env.STORYBOOK_SYMFONY_URL;

    const canvas = document.getElementById('canvas') as HTMLDivElement;
    const context = createMockContext();

    await renderToCanvas(context, canvas);

    expect(context.showError).toHaveBeenCalled();
    expect(context.showMain).not.toHaveBeenCalled();
  });

  it('shows an error when the render endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response)
    );

    const canvas = document.getElementById('canvas') as HTMLDivElement;
    const context = createMockContext();

    await renderToCanvas(context, canvas);

    expect(context.showError).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('500'),
      })
    );
  });
});
