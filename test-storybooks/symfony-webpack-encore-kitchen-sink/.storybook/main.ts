import type { StorybookConfig } from '@storybook/symfony-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.ts', '../src/Twig/Components/**/*.php'],
  addons: [],
  features: {
    experimental_symfonyAutoDiscovery: true,
  },
  framework: {
    name: '@storybook/symfony-vite',
    options: {
      symfony: {
        server: 'php',
      },
    },
  },
};

export default config;
