import { describe, expect, it, vi } from 'vitest';

import { getOrStartServer } from './server/manager.ts';
import { collectPublicAssets, createStaticRuntimeArtifact } from './static/package.ts';
import { symfonyPlugin } from './vite-plugin.ts';

vi.mock('./server/manager.ts', () => ({
  getOrStartServer: vi.fn(),
  stopServer: vi.fn(),
}));

vi.mock('./static/package.ts', () => ({
  collectPublicAssets: vi.fn(),
  createStaticRuntimeArtifact: vi.fn(),
}));

describe('symfonyPlugin', () => {
  it('proxies the managed backend during development', async () => {
    vi.mocked(getOrStartServer).mockResolvedValue({
      type: 'php',
      url: 'http://127.0.0.1:8123',
      stop: vi.fn(),
    });
    const plugin = symfonyPlugin({});

    const config = await plugin.config?.({}, { command: 'serve', mode: 'development' });

    expect(config).toMatchObject({
      define: {
        'import.meta.env.STORYBOOK_SYMFONY_URL': JSON.stringify('/__storybook_symfony'),
      },
      server: {
        proxy: {
          '/assets': {
            target: 'http://127.0.0.1:8123',
            changeOrigin: true,
          },
          '/build': {
            target: 'http://127.0.0.1:8123',
            changeOrigin: true,
          },
          '/bundles': {
            target: 'http://127.0.0.1:8123',
            changeOrigin: true,
          },
          '/__storybook_symfony': {
            target: 'http://127.0.0.1:8123',
            changeOrigin: true,
          },
          '/_components': {
            target: 'http://127.0.0.1:8123',
            changeOrigin: true,
          },
        },
      },
    });
  });

  it('emits a self-contained runtime and public assets in a static build', async () => {
    vi.mocked(getOrStartServer).mockResolvedValue({
      type: 'existing',
      url: 'https://storybook-backend.example.com',
      stop: vi.fn(),
    });
    vi.mocked(createStaticRuntimeArtifact).mockResolvedValue({
      archive: new Uint8Array([1, 2, 3]),
      fileCount: 3,
      fileName: 'symfony-runtime/application-abc123.zip',
    });
    vi.mocked(collectPublicAssets).mockResolvedValue([
      { fileName: 'build/app.js', source: new Uint8Array([4, 5, 6]) },
    ]);
    const plugin = symfonyPlugin({});

    const config = await plugin.config?.({}, { command: 'build', mode: 'production' });

    expect(config).toMatchObject({
      assetsInclude: expect.any(Array),
      define: {
        'import.meta.env.STORYBOOK_SYMFONY_URL': JSON.stringify(''),
        'import.meta.env.STORYBOOK_SYMFONY_ARCHIVE_URL': JSON.stringify(
          './symfony-runtime/application-abc123.zip'
        ),
      },
      worker: { format: 'es' },
    });
    expect(
      (config as { assetsInclude: RegExp[] }).assetsInclude.some((pattern) =>
        pattern.test('php.data')
      )
    ).toBe(true);

    const emitFile = vi.fn();
    plugin.buildStart?.call({ emitFile } as never);

    expect(emitFile).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'asset',
        fileName: 'symfony-runtime/application-abc123.zip',
      })
    );
    expect(emitFile).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'asset', fileName: 'build/app.js' })
    );
  });
});
