import type { Options } from 'storybook/internal/types';
import { describe, expect, it, vi } from 'vitest';

import { core, viteFinal } from './preset.ts';

describe('preset', () => {
  it('core resolves builder and renderer', () => {
    expect(core.builder).toContain('builder-vite');
    expect(core.renderer).toContain('renderers/symfony');
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
