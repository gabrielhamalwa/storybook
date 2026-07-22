# Storybook Symfony Renderer

Develop, document, and test Symfony/Twig components in isolation.

The Symfony renderer is the browser-side layer that turns Storybook stories into rendered Twig components. During development it fetches HTML through the framework's local Symfony proxy. In a static build it sends the same request to a Symfony kernel running in a dedicated PHP-WebAssembly worker. It injects the returned HTML, styles, and scripts into the Storybook preview canvas.

Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).

## What it does

For each story, the renderer:

1. Reads the configured Symfony runtime and the story's `component` identifier and adapter parameters (`adapter`, `template`, `controller`, `live`). When `live` is `true`, the renderer sends `adapter: 'live'` to that runtime.
2. Serializes the story args and posts them to the configured Symfony runtime, including any adapter override.
3. Injects the returned HTML into the preview canvas.
4. Injects the returned styles and scripts into the preview document.
5. Lets Stimulus observe the updated canvas through its normal DOM lifecycle.
6. Returns a teardown function that cleans up injected assets before the next render.

This renderer is used by `@storybook/symfony-vite`, which also starts the PHP server for you. You usually do not need to install it directly.

## Installation

The renderer is installed automatically when you add the framework:

```bash
yarn add -D @storybook/symfony-vite storybook
composer require --dev storybook/symfony-bundle
```

If you are building a custom framework on top of this renderer, install it directly:

```bash
yarn add -D @storybook/symfony
```

## Public types

Stories are written with CSF 3 and typed from `@storybook/symfony` (or `@storybook/symfony-vite`, which re-exports them).

```ts
import type { Meta, StoryObj } from '@storybook/symfony';

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

The `component` field is the component identifier. By default it is the Twig component name registered with `#[AsTwigComponent('Button')]`. You can also set it to a Twig template path (for example `components/Alert.html.twig`) or a controller reference (for example `App\\Controller\\AlertController::fragment`).

### Exported types

| Type | Purpose |
| --- | --- |
| `Meta<TArgs>` | Type for the default story export. |
| `StoryObj<TArgs>` | Type for individual story exports. |
| `StoryFn<TArgs>` | Type for story functions. |
| `Decorator<TArgs>` | Type for decorators. |
| `Loader<TArgs>` | Type for story loaders. |
| `StoryContext<TArgs>` | Type for the story context passed to decorators and loaders. |
| `Preview` | Type for the preview configuration export. |
| `SymfonyRenderer` | Type for the renderer itself. |

## Renderer API

### `render` and `renderToCanvas`

The renderer exports `render` for CSF compatibility and `renderToCanvas` for the actual DOM work. In normal use, Storybook calls `renderToCanvas` automatically.

```ts
import { renderToCanvas } from '@storybook/symfony';
```

### `parameters.symfony`

You can override the Symfony server URL per story, per component, or globally in `.storybook/preview.ts`:

```ts
const preview: Preview = {
  parameters: {
    symfony: {
      serverUrl: 'http://localhost:8000',
    },
  },
};
```

The renderer resolves the server URL in this order:

1. `parameters.symfony.serverUrl` from the story context.
2. `import.meta.env.STORYBOOK_SYMFONY_URL`, injected by `@storybook/symfony-vite`.

If neither is set, the renderer shows an error in the canvas.

### Component adapters

You can override the default Twig component adapter per story or per component by setting `parameters.symfony.adapter` to one of the following values:

| Adapter | `parameters.symfony` | Behavior |
| --- | --- | --- |
| `twig_component` | `{ component: 'Button' }` | Default. Renders a Symfony UX TwigComponent. |
| `template` | `{ adapter: 'template', template: 'components/Alert.html.twig' }` | Renders a plain Twig template with the story args as variables. |
| `controller` | `{ adapter: 'controller', controller: 'App\\Controller\\AlertController::fragment' }` | Renders a Symfony controller fragment. |
| `live` | `{ adapter: 'live', component: 'Notification' }` or `{ live: true, component: 'Notification' }` | Renders a Symfony UX Live Component. Requires `symfony/ux-live-component`. |

When `adapter` is omitted, the PHP bundle detects the adapter from the `component` identifier: `.twig` paths use the template adapter, `::` references use the controller adapter, and everything else uses the Twig component adapter.

Plain template story:

```ts
import type { Meta, StoryObj } from '@storybook/symfony';

const meta = {
  title: 'Templates/Alert',
  component: 'components/Alert.html.twig',
} satisfies Meta<{ message: string }>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    message: 'Saved successfully',
  },
};
```

Controller fragment story:

```ts
import type { Meta, StoryObj } from '@storybook/symfony';

const meta = {
  title: 'Fragments/Alert',
  component: 'App\\Controller\\AlertController::fragment',
} satisfies Meta<{ message: string }>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    message: 'Saved successfully',
  },
};
```

Live component story:

```ts
import type { Meta, StoryObj } from '@storybook/symfony';

const meta = {
  title: 'Live/Notification',
  component: 'Notification',
  parameters: {
    symfony: {
      live: true,
    },
  },
} satisfies Meta<{ message: string }>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    message: 'Saved successfully',
  },
};
```

If `symfony/ux-live-component` is not installed, the render endpoint returns an error.

## Asset injection

The Symfony runtime returns a normalized `assets` object:

```json
{
  "styles": [{ "url": "/build/app.css" }],
  "scripts": [{ "url": "/build/app.js", "type": "module" }],
  "importmap": {
    "imports": { "@hotwired/stimulus": "/build/vendor/stimulus.js" }
  }
}
```

The renderer converts this into DOM elements:

- Styles are injected as `<link rel="stylesheet">` elements.
- Scripts are injected as `<script>` or `<script type="module">` elements.
- Import maps are injected as `<script type="importmap">` elements before any module scripts.

All injected elements are placed in a dedicated container in the document head and are removed when the story is torn down. During development, relative asset URLs resolve through the framework's same-origin proxy. In static builds, root-relative assets are rebased to the Storybook deployment directory.

## Stimulus lifecycle

Stimulus uses a `MutationObserver` to connect controllers added to the document and disconnect controllers removed from it. Controllers declared with `data-controller` in rendered Twig therefore follow their normal lifecycle when Storybook replaces the canvas; the renderer doesn't synthesize browser events.

## Advanced usage

### Per-story server URL

Useful when different stories target different Symfony environments or when the backend is running on a non-default port:

```ts
export const Local: Story = {
  parameters: {
    symfony: {
      serverUrl: 'http://localhost:8000',
    },
  },
};
```

### Decorators

Decorators receive the standard CSF context. Because the actual render is async, decorators can wrap the story with extra DOM or modify args before the component is rendered:

```ts
import type { Decorator } from '@storybook/symfony';

const withPadding: Decorator = (Story, context) => {
  const result = Story(context.args, context);
  return {
    ...result,
    // The framework ignores the placeholder return value;
    // decorators can still mutate context.args before renderToCanvas reads them.
  };
};
```

Most use cases are better served by global parameters or by wrapping the Twig component itself in another template.

### Custom asset injection

The renderer's asset injection is designed to work out of the box with Pentatrion Vite, Webpack Encore, and AssetMapper. If you need a custom pipeline, implement it on the PHP side by providing a service that implements `Storybook\SymfonyBundle\Asset\AssetExtractorInterface` and tagging it as `storybook.asset_pipeline`.

## Migration

If you are migrating from an iframe-based Symfony/Storybook integration, use the framework's [migration guide](https://github.com/storybookjs/storybook/blob/next/docs/get-started/frameworks/symfony-vite-migration.mdx). The renderer itself is installed automatically with `@storybook/symfony-vite`; the migration is mostly about moving story files to `.stories.ts` and configuring the isolated `storybook` Symfony environment.

## Symfony environment

The renderer expects Symfony to boot in a dedicated `storybook` environment. The `@storybook/symfony-vite` framework manages the local server during development and packages that environment for static builds. If you are building a custom integration on top of this renderer, make sure the environment has a minimal `framework.yaml` that enables routing and that the `storybook/symfony-bundle` routes are registered under the `/_storybook` prefix.
