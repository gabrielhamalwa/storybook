# Storybook Symfony Renderer

Develop, document, and test Symfony/Twig components in isolation.

The Symfony renderer is the browser-side layer that turns Storybook stories into rendered Twig components. It fetches HTML from the PHP backend and injects it into the Storybook preview canvas, along with the styles and scripts required by the component.

Learn more about Storybook at [storybook.js.org](https://storybook.js.org/?ref=readme).

## What it does

For each story, the renderer:

1. Reads the Symfony server URL and the story's `component` identifier.
2. Serializes the story args and posts them to the PHP backend.
3. Injects the returned HTML into the preview canvas.
4. Injects the returned styles and scripts into the preview document.
5. Dispatches Stimulus lifecycle events so controllers disconnect before the old DOM is removed and reconnect after the new DOM is inserted.
6. Returns a teardown function that cleans up injected assets and disconnects Stimulus controllers before the next render.

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

The `component` field is the Twig component name as registered with `#[AsTwigComponent('Button')]`.

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

## Asset injection

The PHP backend returns a normalized `assets` object:

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

All injected elements are placed in a dedicated container in the document head and are removed when the story is torn down. Scripts are re-injected on every render so that Stimulus controllers are evaluated against the new DOM, but the renderer deduplicates by URL to avoid unnecessary reloads.

## Stimulus lifecycle

Symfony UX Stimulus controllers normally connect on the browser's `DOMContentLoaded` event. Because Storybook reuses the same preview document for every story, the renderer manages the lifecycle explicitly:

- Before replacing the canvas HTML, it dispatches `stimulus:disconnect` to disconnect controllers in the current canvas.
- After injecting the new HTML and assets, it dispatches `DOMContentLoaded` on the document and window so controllers in the new canvas connect.

Controllers that are declared with `data-controller` in the rendered Twig template connect automatically. The teardown function disconnects them again before the next story is rendered.

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
