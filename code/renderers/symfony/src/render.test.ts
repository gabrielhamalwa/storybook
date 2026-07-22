/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RenderContext } from 'storybook/internal/types';

import { renderToCanvas } from './render.ts';
import type { SymfonyRenderer } from './types.ts';
import { requestSymfonyWasm } from './wasm/client.ts';

vi.mock('./wasm/client.ts', () => ({
  getStaticAssetBaseUrl: vi.fn().mockReturnValue('/design-system'),
  installLiveComponentFetchBridge: vi.fn(),
  requestSymfonyWasm: vi.fn(),
}));

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
      globals: { locale: 'de' },
      parameters: {
        symfony: {
          adapter: 'template',
          template: 'components/button.html.twig',
        },
      },
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
    delete import.meta.env.STORYBOOK_SYMFONY_ARCHIVE_URL;
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
        body: JSON.stringify({
          componentId: 'Button',
          adapter: 'template',
          template: 'components/button.html.twig',
          controller: undefined,
          args: { label: 'Click me' },
          globals: { locale: 'de' },
        }),
      }
    );
    expect(canvas.innerHTML).toBe('<button class="btn">Click me</button>');
    expect(context.showMain).toHaveBeenCalled();
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
        json: vi.fn().mockResolvedValue({
          error: 'Failed to render component',
          message: 'Unknown component "Missing".',
        }),
      } as unknown as Response)
    );

    const canvas = document.getElementById('canvas') as HTMLDivElement;
    const context = createMockContext();

    await renderToCanvas(context, canvas);

    expect(context.showError).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Symfony render endpoint returned 500: Unknown component "Missing".',
      })
    );
  });

  it('selects the live adapter when live is enabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          html: '<div>Live</div>',
          assets: { styles: [], scripts: [] },
        }),
      } as unknown as Response)
    );

    const context = createMockContext({
      storyContext: {
        args: {},
        globals: {},
        parameters: { symfony: { live: true } },
      },
    });

    await renderToCanvas(context, document.getElementById('canvas') as HTMLDivElement);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          componentId: 'Button',
          adapter: 'live',
          args: {},
          globals: {},
        }),
      })
    );
  });

  it('renders through the packaged browser runtime in a static build', async () => {
    delete import.meta.env.STORYBOOK_SYMFONY_URL;
    import.meta.env.STORYBOOK_SYMFONY_ARCHIVE_URL = './symfony-runtime/application.zip';
    vi.mocked(requestSymfonyWasm).mockResolvedValue(
      new Response(
        JSON.stringify({
          html: '<button>Static</button>',
          assets: {
            styles: [],
            scripts: [],
            importmap: { imports: { app: '/build/app.js' } },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const canvas = document.getElementById('canvas') as HTMLDivElement;
    await renderToCanvas(createMockContext(), canvas);

    expect(requestSymfonyWasm).toHaveBeenCalledWith(
      './symfony-runtime/application.zip',
      '/_storybook/render/button--primary',
      expect.objectContaining({ method: 'POST' })
    );
    expect(canvas.innerHTML).toBe('<button>Static</button>');
    expect(document.querySelector('script[type="importmap"]')?.textContent).toContain(
      '/design-system/build/app.js'
    );
  });
});
