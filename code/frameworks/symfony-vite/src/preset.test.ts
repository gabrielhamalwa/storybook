import type { Options } from 'storybook/internal/types';
import { describe, expect, it, vi } from 'vitest';

import { core, viteFinal } from './preset.ts';

vi.mock('./server/manager.ts', () => ({
  getOrStartServer: vi.fn().mockResolvedValue({ url: 'http://localhost:8000' }),
}));

describe('preset', () => {
  it('core resolves builder and renderer', async () => {
    const options = {
      presets: {
        apply: vi.fn().mockResolvedValue({
          name: '@storybook/symfony-vite',
          options: { symfony: { server: 'existing', serverUrl: 'http://localhost:8000' } },
        }),
      },
    } as unknown as Options;

    const resolved = await (core as any)({}, options);

    expect(resolved.builder).toContain('builder-vite');
    expect(resolved.renderer).toContain('renderers/symfony');
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
});
