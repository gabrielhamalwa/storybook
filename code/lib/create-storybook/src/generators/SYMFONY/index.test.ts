import { describe, expect, it, vi } from 'vitest';

import { ProjectType } from 'storybook/internal/cli';
import { logger } from 'storybook/internal/node-logger';
import { SupportedBuilder, SupportedFramework, SupportedRenderer } from 'storybook/internal/types';

import symfonyGenerator from './index.ts';

vi.mock('storybook/internal/node-logger', { spy: true });

describe('Symfony generator', () => {
  it('uses the official Symfony renderer and Vite framework', () => {
    expect(symfonyGenerator.metadata).toEqual({
      projectType: ProjectType.SYMFONY,
      renderer: SupportedRenderer.SYMFONY,
      framework: SupportedFramework.SYMFONY_VITE,
      builderOverride: SupportedBuilder.VITE,
    });
  });

  it('adds Vite and reports the required Composer package', async () => {
    vi.mocked(logger.info).mockImplementation(() => {});

    await expect(symfonyGenerator.configure()).resolves.toEqual({
      extraPackages: ['vite'],
    });

    symfonyGenerator.postConfigure?.();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('phloom/storybook-symfony-bundle')
    );
  });
});
