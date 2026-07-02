import type { StorybookConfig } from '@storybook/symfony-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.ts'],
  addons: [],
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
