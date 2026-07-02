# Storybook for Symfony and Vite

Develop, document, and test Symfony/Twig components in isolation with Storybook and Vite.

Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).

## Requirements

- PHP 8.2 or higher
- A Symfony project with Twig installed
- The `storybook/symfony-bundle` Composer package installed and enabled
- Vite 5, 6, 7, or 8

## Installation

```bash
yarn add -D @storybook/symfony-vite storybook
composer require --dev storybook/symfony-bundle
```

## Configuration

```ts
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/symfony-vite';

const config: StorybookConfig = {
  stories: ['../templates/components/**/*.stories.ts'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/symfony-vite',
    options: {
      symfony: {
        environment: 'storybook',
        server: 'php',
      },
    },
  },
};

export default config;
```

## Server options

The framework can start a PHP backend for you, or connect to one that is already running.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `environment` | `string` | `'storybook'` | Symfony environment used to boot the kernel. |
| `projectDir` | `string` | `process.cwd()` | Path to the Symfony project root. |
| `publicDir` | `string` | `<projectDir>/public` | Path to the public directory. |
| `server` | `'php' \| 'frankenphp' \| 'roadrunner' \| 'symfony-cli' \| 'existing'` | `'php'` | PHP server backend. |
| `serverUrl` | `string` | — | URL to use when `server` is `'existing'`. |
| `port` | `number` | random free port | Port for the PHP server. |
| `phpBinary` | `string` | `'php'` | Path to the PHP binary. |
| `console` | `string` | `<projectDir>/bin/console` | Path to the Symfony console. |

When `server` is omitted, the framework auto-detects the best available backend in this order: FrankenPHP, RoadRunner, Symfony CLI, then `php -S`.

### Connect to an existing server

```ts
framework: {
  name: '@storybook/symfony-vite',
  options: {
    symfony: {
      server: 'existing',
      serverUrl: 'http://localhost:8000',
    },
  },
},
```

### Use a random free port

```ts
framework: {
  name: '@storybook/symfony-vite',
  options: {
    symfony: {
      server: 'php',
      port: 0,
    },
  },
},
```

## Runtime flow

When you run `storybook dev`, the framework:

1. Starts the configured PHP server in the `storybook` environment.
2. Polls `GET /_storybook/health` until the backend is ready.
3. Injects the server URL into the preview bundle as `import.meta.env.STORYBOOK_SYMFONY_URL`.
4. Stops the PHP server when the Vite dev server shuts down.

When you select a story, the renderer calls `POST /_storybook/render/{componentId}` with the story args and injects the returned HTML into the preview canvas.
