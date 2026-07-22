import type { PresetProperty } from 'storybook/internal/types';
import type { PluginOption } from 'vite';

import { getOrStartServer } from './server/manager.ts';
import type { StorybookConfig } from './types.ts';
import { symfonyPlugin } from './vite-plugin.ts';

const SYMFONY_APPLICATION_PLUGINS = new Set(['symfony-entrypoints', 'symfony-stimulus']);

export const core: PresetProperty<'core'> = async (config, options) => {
  const framework = await options.presets.apply('framework');
  const frameworkOptions = typeof framework === 'string' ? {} : (framework.options ?? {});

  await getOrStartServer(frameworkOptions.symfony);

  return {
    ...config,
    builder: config?.builder ?? {
      name: import.meta.resolve('@storybook/builder-vite'),
      options: frameworkOptions.builder ?? {},
    },
    renderer: config?.renderer ?? import.meta.resolve('@storybook/symfony/preset'),
  };
};

export const viteFinal: NonNullable<StorybookConfig['viteFinal']> = async (config, options) => {
  const framework = await options.presets.apply('framework');
  const frameworkOptions = typeof framework === 'string' ? {} : (framework.options ?? {});

  const plugins = [
    ...withoutSymfonyApplicationPlugins(config?.plugins ?? []),
    symfonyPlugin(frameworkOptions),
  ];

  return { ...config, plugins };
};

function withoutSymfonyApplicationPlugins(plugins: PluginOption[]): PluginOption[] {
  return plugins.flatMap((plugin) => {
    if (Array.isArray(plugin)) {
      return withoutSymfonyApplicationPlugins(plugin);
    }

    if (
      plugin &&
      typeof plugin === 'object' &&
      'name' in plugin &&
      SYMFONY_APPLICATION_PLUGINS.has(String(plugin.name))
    ) {
      return [];
    }

    return [plugin];
  });
}
