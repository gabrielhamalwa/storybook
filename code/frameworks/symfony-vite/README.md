# Storybook for Symfony and Vite

Develop, document, and test Symfony/Twig components in isolation with Storybook and Vite.

Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).

## Requirements

- PHP 8.2 or higher
- A Symfony project with Twig and Symfony UX TwigComponent installed
- The `storybook/symfony-bundle` Composer package installed and enabled
- Vite 5, 6, 7, or 8

## Installation

Run the standard Storybook initializer from the Symfony project root:

```bash
npx storybook@latest init
```

It detects `symfony/framework-bundle`, installs the Symfony/Vite framework, and generates the
standard Storybook configuration. Then install the companion Composer bundle:

```bash
composer require --dev storybook/symfony-bundle
```

Then enable the bundle in `config/bundles.php` if Symfony Flex did not register it:

```php
return [
    // ...
    Storybook\SymfonyBundle\StorybookBundle::class => ['storybook' => true],
];
```

Finally, add the bundle's routes in the `storybook` environment, for example `config/routes/storybook.yaml`:

```yaml
storybook:
  resource: Storybook\SymfonyBundle\Controller\StorybookController
  type: attribute
```

### Storybook environment config

Storybook boots Symfony in a dedicated `storybook` environment. Keep it minimal so the container compiles quickly. A minimal `config/packages/storybook/framework.yaml` looks like this:

```yaml
framework:
  router:
    utf8: true
    strict_requirements: ~
  test: false
  session:
    enabled: false
```

You also need Twig, TwigComponent, and Stimulus enabled in that environment. Add the following files only if you need to override the default environment configuration:

```yaml
# config/packages/storybook/twig.yaml
twig:
  default_path: '%kernel.project_dir%/templates'

# config/packages/storybook/twig_component.yaml
twig_component:
  anonymous_template_directory: 'components/'
  defaults:
    App\Twig\Components\: 'components/'

# config/packages/storybook/stimulus.yaml
stimulus:
  controllers_path: '%kernel.project_dir%/assets/controllers'
  controller_jsons_path: '%kernel.project_dir%/assets/controllers.json'
```

If you use AssetMapper, also add `config/packages/storybook/assets.yaml`:

```yaml
framework:
  asset_mapper:
    paths:
      assets/
    importmap_path: '%kernel.project_dir%/importmap.php'
```

## Quick start

1. Create a Twig component in `src/Twig/Components/Button.php`:

```php
<?php

namespace App\Twig\Components;

use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

#[AsTwigComponent('Button')]
final class Button
{
    public string $label = 'Button';
    public string $variant = 'primary';
}
```

2. Create its template in `templates/components/Button.html.twig`:

```twig
<button
  type="button"
  data-controller="button"
  data-button-variant-value="{{ variant }}"
  class="btn btn-{{ variant }}"
>
  {{ label }}
</button>
```

3. Configure Storybook in `.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@storybook/symfony-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.ts'],
  addons: ['@storybook/addon-essentials'],
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
```

4. Write a story in `stories/Button.stories.ts`:

```ts
import type { Meta, StoryObj } from '@storybook/symfony-vite';

type ButtonArgs = {
  label: string;
  variant?: 'primary' | 'secondary';
};

const meta = {
  title: 'Components/Button',
  component: 'Button',
} satisfies Meta<ButtonArgs>;

export default meta;
type Story = StoryObj<ButtonArgs>;

export const Primary: Story = {
  args: {
    label: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Secondary Button',
    variant: 'secondary',
  },
};
```

5. Run Storybook:

```bash
yarn storybook
```

The framework starts the PHP server, boots the Symfony kernel in the `storybook` environment, and renders your components in the Storybook canvas.

## Component adapters

Stories render through the PHP bundle. The default adapter is Symfony UX TwigComponent, but you can also render plain Twig templates, controller fragments, and Symfony UX Live Components by setting `parameters.symfony.adapter` (or by letting the bundle detect the adapter from the component identifier).

### Twig component (default)

The `component` property is the Twig component name registered with `#[AsTwigComponent('Button')]`. The bundle renders it with the story args as props.

```ts
import type { Meta, StoryObj } from '@storybook/symfony-vite';

type ButtonArgs = {
  label: string;
  variant?: 'primary' | 'secondary';
};

const meta = {
  title: 'Components/Button',
  component: 'Button',
} satisfies Meta<ButtonArgs>;

export default meta;
type Story = StoryObj<ButtonArgs>;

export const Primary: Story = {
  args: {
    label: 'Primary Button',
    variant: 'primary',
  },
};
```

### Plain Twig template

Set the `component` property to a template path, or set `parameters.symfony.adapter` to `'template'` with an explicit `template` path. The story args become Twig variables.

```ts
import type { Meta, StoryObj } from '@storybook/symfony-vite';

type AlertArgs = {
  message: string;
};

const meta = {
  title: 'Templates/Alert',
  component: 'components/Alert.html.twig',
} satisfies Meta<AlertArgs>;

export default meta;
type Story = StoryObj<AlertArgs>;

export const Info: Story = {
  args: {
    message: 'Saved successfully',
  },
};
```

Or use an explicit adapter:

```ts
export const Alert: Story = {
  parameters: {
    symfony: {
      adapter: 'template',
      template: 'components/Alert.html.twig',
    },
  },
  args: {
    message: 'Saved successfully',
  },
};
```

### Controller fragment

Set the `component` property to a controller reference (`Controller::action`), or use `parameters.symfony.adapter: 'controller'` with an explicit `controller` value. The story args are passed to the controller action.

```ts
import type { Meta, StoryObj } from '@storybook/symfony-vite';

type AlertFragmentArgs = {
  message: string;
};

const meta = {
  title: 'Fragments/Alert',
  component: 'App\\Controller\\AlertController::fragment',
} satisfies Meta<AlertFragmentArgs>;

export default meta;
type Story = StoryObj<AlertFragmentArgs>;

export const Info: Story = {
  args: {
    message: 'Saved successfully',
  },
};
```

Or use an explicit adapter:

```ts
export const Alert: Story = {
  parameters: {
    symfony: {
      adapter: 'controller',
      controller: 'App\\Controller\\AlertController::fragment',
    },
  },
  args: {
    message: 'Saved successfully',
  },
};
```

### Live component

Live components require `symfony/ux-live-component`. Set `parameters.symfony.adapter` to `'live'` or `live: true` and keep the `component` property as the live component name. The backend renders the live component markup; reactivity is provided by the component itself.

```ts
import type { Meta, StoryObj } from '@storybook/symfony-vite';

type NotificationArgs = {
  message: string;
};

const meta = {
  title: 'Live/Notification',
  component: 'Notification',
  parameters: {
    symfony: {
      live: true,
    },
  },
} satisfies Meta<NotificationArgs>;

export default meta;
type Story = StoryObj<NotificationArgs>;

export const Info: Story = {
  args: {
    message: 'Saved successfully',
  },
};
```

If `symfony/ux-live-component` is not installed, the render endpoint returns an error.

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
| `server` | `'php' \| 'frankenphp' \| 'roadrunner' \| 'symfony-cli' \| 'existing' \| 'auto'` | `'auto'` | PHP server backend. |
| `serverUrl` | `string` | — | URL to use when `server` is `'existing'`. |
| `port` | `number` | random free port | Port for the PHP server. |
| `phpBinary` | `string` | `'php'` | Path to the PHP binary. |
| `console` | `string` | `<projectDir>/bin/console` | Path to the Symfony console. |
| `prewarmCache` | `boolean` | `true` | Run `cache:warmup` (and `asset-map:compile` when AssetMapper is available) for the configured environment before starting the PHP server. |
| `publicAssetPaths` | `string[]` | `['/assets', '/build', '/bundles']` | Public URL prefixes proxied during development and copied into static builds. |
| `staticInclude` | `string[]` | — | Additional project-relative, non-secret paths to include in the static runtime. |
| `staticExclude` | `string[]` | — | Additional project-relative paths to exclude from the static runtime. |

When `server` is omitted or set to `'auto'`, the framework prefers FrankenPHP, then the Symfony
CLI, and falls back to `php -S`. FrankenPHP is the recommended managed backend, Symfony CLI and
`php -S` are supported fallbacks, and `existing` connects to a server managed by the application.
RoadRunner is an explicit advanced option because its worker runtime is application-specific.

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

This override applies to development and build-time indexing. Production output still uses the
self-contained browser runtime and does not call the existing server after deployment.

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

1. Pre-warms the Symfony container cache for the configured environment (unless `prewarmCache` is `false` or `server` is `existing`).
2. Starts the configured PHP server in the `storybook` environment.
3. Polls `GET /_storybook/health` until the backend is ready.
4. Proxies the backend through the Vite dev server and injects that same-origin path into the preview bundle.
5. Stops the PHP server when the Vite dev server shuts down.

Cache pre-warming is a startup-latency optimization, not a rendering requirement. It also runs for
the temporary managed backend used during build-time indexing, but it does not affect the PHP-WASM
runtime emitted by a static build. Failures warn and continue so Symfony can compile the cache on
the first request.

When you select a story, the renderer calls `POST /_storybook/render/{storyId}` with the component ID, optional adapter, template, controller, and story args, then injects the returned HTML and assets into the preview canvas.

## Static builds

Run Storybook's standard build command:

```bash
storybook build
```

Like every other framework, the default output is `storybook-static/`. The directory is a
self-contained static web application: it can be copied to any static file server or object host and
does not need PHP, Symfony, Node.js, or a render API after the build completes. The browser lazily
starts PHP 8.4 WebAssembly in a dedicated worker and uses the real Symfony kernel for initial renders,
control updates, and Live Component actions.

The static interaction suite covers Chromium, Firefox, and WebKit. The runtime selects native JSPI
when available and Asyncify otherwise; no browser flags are required. Live Component actions,
including uploads submitted with Symfony UX's `files(...)` action modifier, work across that matrix.
Selected files are staged only for the action and are restored as Symfony `UploadedFile` objects.

The build packages application code, templates, configuration, translations, Composer dependencies,
the front controller, and configured public asset roots. It excludes `.env*`, Symfony secrets,
repository metadata, tests, caches, logs, and unverified external symlinks. The archive contains PHP
source and is inspectable by anyone who can download the Storybook.

Build application assets in production mode first. A manifest that references `localhost` fails the
Storybook build. Composer requirements for PHP extensions unavailable in the browser runtime also
fail with the missing extension names.

Static assets are rebased to the Storybook deployment directory, so the same output works at `/` or
a nested path such as `/design-system/`. The host should serve `.wasm` as `application/wasm` and make
the emitted `.zip`, JavaScript, shared-object, and WASM files publicly readable.

The supported static runtime does not require the `unsafe-eval` Content Security Policy source. It
does require the narrower `wasm-unsafe-eval` source for WebAssembly compilation, plus same-origin
worker and connection permissions. The static E2E suite enforces this policy and records CSP
violations while rendering controls, Stimulus, and Live Components. Storybook's generated HTML also
contains inline bootstrap scripts and styles, which require `unsafe-inline` unless the hosting
pipeline supplies hashes or nonces.

The upstream PHP-WASM packages still contain dormant dynamic-execution branches for generic APIs
outside the supported Symfony runtime path. Whether those branches must be removed from distributed
code remains a stable-release security-review question. The runtime's GPL-2.0-or-later distribution
terms are a separate stable-release gate tracked in the RFC.

### Pre-warm cache on install

Add a `postinstall` script to your project's `package.json` to pre-warm the Symfony container cache after every install:

```json
{
  "scripts": {
    "postinstall": "prewarm-symfony-storybook-cache"
  }
}
```

The script runs `php bin/console cache:warmup --env=storybook` from the project root, and also runs `php bin/console asset-map:compile --env=storybook` when AssetMapper is available. If PHP or the Symfony console is not available, it logs a warning and exits without failing the install.

## Asset pipeline support

The PHP bundle auto-detects the installed asset pipeline by checking for known Symfony services:

- Pentatrion Vite (`pentatrion/vite-bundle`)
- Webpack Encore (`symfony/webpack-encore-bundle`)
- AssetMapper (`symfony/asset-mapper`)
- None (no CSS or JS extracted)

The bundle reads the `app` entrypoint by default. You can change the entrypoint or explicitly set the pipeline in the bundle configuration:

```yaml
# config/packages/storybook/storybook.yaml
storybook:
  asset_pipeline: auto
  entrypoint: app
```

`asset_pipeline` accepts `auto`, `pentatrion_vite`, `encore`, `asset_mapper`, or `none`. The default `auto` setting detects the installed pipeline in this order: Pentatrion Vite, Webpack Encore, AssetMapper, then none.

### Pentatrion Vite development

When you use Pentatrion Vite, the Vite dev server must be running alongside Storybook so the `entrypoints.json` is generated and the dev server URLs are available. The simplest way is to start both with a script:

```json
{
  "scripts": {
    "dev": "concurrently \"yarn vite\" \"yarn storybook\"",
    "storybook": "storybook dev -p 6006"
  }
}
```

```bash
yarn dev
```

## Stimulus

Symfony UX Stimulus controllers connect automatically when the component template declares `data-controller`. Because the PHP render is asynchronous, the controller may not be connected yet when the `play` function starts. Use `waitFor` from `storybook/test` to wait for the `data-connected` attribute before triggering actions:

```ts
import { expect, userEvent, waitFor, within } from 'storybook/test';

export const Clickable = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');

    await waitFor(() => expect(button).toHaveAttribute('data-connected', 'true'));
    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute('data-clicked', 'true'));
  },
};
```

## Migration

If you are migrating from an iframe-based Symfony/Storybook integration such as `sensiolabs/StorybookBundle`, follow the [migration guide](https://github.com/storybookjs/storybook/blob/next/docs/get-started/frameworks/symfony-vite-migration.mdx). It covers removing iframe patches, migrating `.stories.json` files to `.stories.ts`, and configuring the `storybook` environment.

## Troubleshooting

### The PHP server fails to start

Check that:

- `php` is available in your shell `PATH`.
- The `public/index.php` file exists in your Symfony project.
- The Symfony console at `bin/console` is executable.
- The `storybook` environment has a minimal `framework.yaml` that enables routing.

### Storybook shows "No Symfony server URL is configured"

The renderer could not find a server URL. Make sure one of the following is true:

- The framework started the PHP server successfully (`GET /_storybook/health` returned `{"status":"ok"}`).
- You set `framework.options.symfony.serverUrl` when using `server: 'existing'`.
- You set `parameters.symfony.serverUrl` in `.storybook/preview.ts` or in the story.

### Components render without styles or Stimulus controllers do not connect

- Verify the bundle detected the correct asset pipeline in the `storybook` environment. Check the response from `POST /_storybook/render/{storyId}` and confirm the `assets` object contains the expected styles and scripts.
- Make sure the asset entrypoint (`app` by default) includes the CSS and Stimulus bootstrap for your components.
- For Stimulus, confirm that the rendered HTML contains `data-controller` attributes matching the controller names in your `assets/controllers/` files.

### The backend health check times out

The framework waits up to 30 seconds for `GET /_storybook/health` to respond. If it times out:

- Start the PHP server manually with `php -S 127.0.0.1:8000 -t public public/index.php` and set `server: 'existing'` with `serverUrl: 'http://127.0.0.1:8000'` to isolate the issue.
- Run `APP_ENV=storybook bin/console debug:router` to confirm the `/_storybook/*` routes are registered.
- Check Symfony logs for container compilation errors in the `storybook` environment.

### Auto-detection picked the wrong server backend

Set `server` explicitly in `.storybook/main.ts` instead of relying on `'auto'`:

```ts
framework: {
  name: '@storybook/symfony-vite',
  options: {
    symfony: {
      server: 'frankenphp',
    },
  },
},
```
