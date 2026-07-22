import type { Options } from 'storybook/internal/types';
import { describe, expect, it, vi } from 'vitest';

import { core, viteFinal } from './preset.ts';

const runCore = core as unknown as (
  config: Record<string, unknown>,
  options: Options
) => Promise<{ builder: { name: string }; renderer: string }>;

vi.mock('./server/manager.ts', () => ({
  getOrStartServer: vi.fn().mockResolvedValue({ url: 'http://127.0.0.1:8000' }),
}));

describe('preset', () => {
  it('core resolves builder and renderer and starts the backend', async () => {
    const options = {
      configType: 'DEVELOPMENT',
      presets: {
        apply: vi.fn().mockResolvedValue({
          name: '@storybook/symfony-vite',
          options: { symfony: { projectDir: '/project' } },
        }),
      },
    } as unknown as Options;

    const resolved = await runCore({}, options);

    expect(resolved.builder.name).toContain('builder-vite');
    expect(resolved.renderer).toContain('renderers/symfony');
  });

  it('uses the standard builder and renderer for static builds', async () => {
    const options = {
      configType: 'PRODUCTION',
      presets: {
        apply: vi.fn().mockResolvedValue({ name: '@storybook/symfony-vite', options: {} }),
      },
    } as unknown as Options;

    await expect(runCore({}, options)).resolves.toEqual(
      expect.objectContaining({
        builder: expect.objectContaining({ name: expect.stringContaining('builder-vite') }),
        renderer: expect.stringContaining('renderers/symfony'),
      })
    );
  });

  it('viteFinal adds the symfony plugin to the config', async () => {
    const options = {
      presets: {
        apply: vi.fn().mockResolvedValue({
          name: '@storybook/symfony-vite',
          options: { symfony: { server: 'existing', serverUrl: 'http://localhost:8000' } },
        }),
      },
    } as unknown as Options;

    const config = await viteFinal({ plugins: [] }, options);

    expect(config.plugins).toHaveLength(1);
  });

  it('removes Symfony application plugins from the Storybook Vite build', async () => {
    const options = {
      presets: {
        apply: vi.fn().mockResolvedValue({ name: '@storybook/symfony-vite', options: {} }),
      },
    } as unknown as Options;

    const config = await viteFinal(
      {
        plugins: [
          [{ name: 'symfony-entrypoints' }, { name: 'symfony-stimulus' }],
          { name: 'keep-me' },
        ],
      },
      options
    );

    expect(config.plugins?.map((plugin) => plugin && 'name' in plugin && plugin.name)).toEqual([
      'keep-me',
      'storybook-symfony',
    ]);
  });
});
