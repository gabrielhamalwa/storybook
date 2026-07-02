import type { PresetProperty } from 'storybook/internal/types';

import type { StorybookConfig } from './types.ts';

export const core: PresetProperty<'core'> = {
  builder: import.meta.resolve('@storybook/builder-vite'),
  renderer: import.meta.resolve('@storybook/symfony/preset'),
};

export const viteFinal: NonNullable<StorybookConfig['viteFinal']> = async (config) => {
  const plugins = [...(config?.plugins ?? [])];

  // TODO: add Symfony Vite plugin that starts the PHP server

  return { ...config, plugins };
};
