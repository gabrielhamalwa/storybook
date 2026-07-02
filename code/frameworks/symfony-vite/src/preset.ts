import type { PresetProperty } from 'storybook/internal/types';

import type { StorybookConfig } from './types.ts';
import { symfonyPlugin } from './vite-plugin.ts';

export const core: PresetProperty<'core'> = {
  builder: import.meta.resolve('@storybook/builder-vite'),
  renderer: import.meta.resolve('@storybook/symfony/preset'),
};

export const viteFinal: NonNullable<StorybookConfig['viteFinal']> = async (config, options) => {
  const framework = await options.presets.apply('framework');
  const frameworkOptions = typeof framework === 'string' ? {} : (framework.options ?? {});

  const plugins = [...(config?.plugins ?? []), symfonyPlugin(frameworkOptions)];

  return { ...config, plugins };
};
