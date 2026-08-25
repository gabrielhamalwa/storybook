import type { StorybookConfig } from '@storybook/symfony-vite';

const existingServerUrl = process.env.STORYBOOK_SYMFONY_URL;

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.ts', '../stories/**/*.mdx', '../src/Twig/Components/**/*.php'],
  addons: ['@storybook/addon-docs'],
  features: {
    experimental_symfonyAutoDiscovery: true,
  },
  framework: {
    name: '@storybook/symfony-vite',
    options: {
      symfony: {
        // STORYBOOK_SYMFONY_URL is an optional local/existing-server override.
        // Production builds package Symfony into the browser automatically.
        server: existingServerUrl ? 'existing' : 'php',
        serverUrl: existingServerUrl,

        // Symfony environment, project root, and public directory:
        // environment: 'storybook',
        // projectDir: process.cwd(),
        // publicDir: 'public',

        // Port for the managed server (0 = random free port):
        // port: 0,

        // PHP binary and console paths when not using the defaults:
        // phpBinary: 'php',
        // console: 'bin/console',
      },
    },
  },
};

export default config;
