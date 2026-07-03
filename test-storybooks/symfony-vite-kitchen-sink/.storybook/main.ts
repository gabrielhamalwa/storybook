import type { StorybookConfig } from '@storybook/symfony-vite';

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
        // Server backend: 'php' (default php -S), 'frankenphp', 'roadrunner',
        // 'symfony-cli', 'existing', or 'auto' to detect the best available.
        server: 'php',

        // For 'existing', point Storybook at a server you already started:
        // server: 'existing',
        // serverUrl: 'http://localhost:8000',

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
