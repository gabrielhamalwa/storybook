# Storybook for Symfony and Vite

Develop, document, and test Symfony/Twig components in isolation with Storybook and Vite.

Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).

## Requirements

- PHP 8.2 or higher
- A Symfony project with Twig and Symfony UX TwigComponent installed
- The `storybook/symfony-bundle` Composer package installed and enabled
- Vite 5, 6, 7, or 8

## Installation

The easiest way to add Storybook to an existing Symfony project is the `add` command:

```bash
npx storybook add @storybook/symfony-vite
```

You can also install the packages manually:

```bash
yarn add -D @storybook/symfony-vite storybook
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
| `server` | `'php' \| 'frankenphp' \| 'roadrunner' \| 'symfony-cli' \| 'existing'` | `'auto'` | PHP server backend. |
| `serverUrl` | `string` | — | URL to use when `server` is `'existing'`. |
| `port` | `number` | random free port | Port for the PHP server. |
| `phpBinary` | `string` | `'php'` | Path to the PHP binary. |
| `console` | `string` | `<projectDir>/bin/console` | Path to the Symfony console. |
| `prewarmCache` | `boolean` | `true` | Run `cache:warmup` for the configured environment before starting the PHP server. |

When `server` is omitted or set to `'auto'`, the framework detects the best available backend in this order: FrankenPHP, RoadRunner, Symfony CLI, then `php -S`.

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

1. Pre-warms the Symfony container cache for the configured environment (unless `prewarmCache` is `false` or `server` is `existing`).
2. Starts the configured PHP server in the `storybook` environment.
3. Polls `GET /_storybook/health` until the backend is ready.
4. Injects the server URL into the preview bundle as `import.meta.env.STORYBOOK_SYMFONY_URL`.
5. Stops the PHP server when the Vite dev server shuts down.

When you select a story, the renderer calls `POST /_storybook/render/{storyId}` with the component ID, optional adapter, template, controller, and story args, then injects the returned HTML and assets into the preview canvas.

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

## Migration

If you are migrating from an iframe-based Symfony/Storybook integration such as `sensiolabs/StorybookBundle`, follow the [migration guide](https://github.com/storybookjs/storybook/blob/next/docs/get-started/frameworks/symfony-vite-migration.mdx). It covers removing iframe patches, migrating `.stories.json` files to `.stories.ts`, and configuring the `storybook` environment.

## RFC and release plan

The high-level architecture, server backends, and proposed release timeline are documented in the [RFC](https://github.com/storybookjs/storybook/blob/next/.devin/plans/RFC.md). The project is targeting an alpha, beta, RC, and stable release path once the core slices are validated in the kitchen-sink.

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
