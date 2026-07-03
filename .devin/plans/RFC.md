# RFC: Storybook for Symfony/Twig

## Status

Draft for the Storybook core team.

## Problem statement

Symfony applications are built with Twig templates and Symfony UX components. Today, developers who want to develop or document these components in isolation typically use iframe-based integrations that render a full Symfony page inside the Storybook preview. These integrations are hard to configure, slow to start, and do not integrate with Storybook's addon ecosystem, testing features, or CSF 3.

Storybook needs a first-class framework for Symfony that:

- Renders Twig components, plain Twig templates, controller fragments, and Symfony UX Live Components in the Storybook canvas.
- Uses the same Vite-based developer experience as the rest of the Storybook ecosystem.
- Supports the most common Symfony asset pipelines: Pentatrion Vite, Webpack Encore, and AssetMapper.
- Starts automatically and stays fast enough for day-to-day component work.

## Proposed architecture

The integration is split into three published packages so the browser, Node, and PHP sides can evolve independently.

| Package | Responsibility | Install |
| --- | --- | --- |
| `@storybook/symfony` | Renderer: browser-side DOM injection, Stimulus lifecycle, asset injection | Installed via the framework |
| `@storybook/symfony-vite` | Framework: Vite builder, PHP server lifecycle, Storybook config | `npx storybook add @storybook/symfony-vite` |
| `storybook/symfony-bundle` | Composer bundle: render endpoints, component adapters, asset extractors | `composer require --dev storybook/symfony-bundle` |

### Renderer (`@storybook/symfony`)

The renderer is the browser-side layer. For each story it:

1. Reads the component identifier and adapter parameters from the story context.
2. POSTs the story args and globals to the PHP render endpoint.
3. Injects the returned HTML into the Storybook canvas.
4. Injects the returned styles, scripts, and import map into the preview document.
5. Dispatches Stimulus lifecycle events so controllers disconnect before the old DOM is removed and reconnect after the new DOM is inserted.
6. Cleans up injected assets and disconnects controllers when the story is torn down.

### Framework (`@storybook/symfony-vite`)

The framework wraps the Vite builder and the renderer. When `storybook dev` starts:

1. Pre-warms the Symfony container cache for the configured environment.
2. Starts the PHP server if one is not already running.
3. Polls the bundle health endpoint until the backend is ready.
4. Injects the PHP server URL into the preview bundle as `import.meta.env.STORYBOOK_SYMFONY_URL`.
5. Stops the PHP server when the Vite dev server shuts down.

### Composer bundle (`storybook/symfony-bundle`)

The bundle exposes the PHP runtime:

- `GET /_storybook/health` — readiness check for the framework.
- `POST /_storybook/render/{id}` — renders a component and returns HTML, assets, and metadata.
- `GET /_storybook/index` — returns discoverable components for the experimental auto-discovery indexer.
- `GET /_storybook/source/{id}` — returns component source and template source for the docs panel.

## Component adapters

The bundle supports four adapters selected from the story metadata or auto-detected from the component identifier.

| Adapter | Identifier | Trigger |
| --- | --- | --- |
| Twig component | `Button` | Default; uses Symfony UX TwigComponent. |
| Plain Twig template | `components/Alert.html.twig` | `.twig` suffix or `parameters.symfony.adapter: 'template'`. |
| Controller fragment | `App\Controller\AlertController::fragment` | `::` in the identifier or `parameters.symfony.adapter: 'controller'`. |
| Live component | `Notification` | `parameters.symfony.adapter: 'live'`. Requires `symfony/ux-live-component`. |

## Asset pipelines

The bundle auto-detects the installed asset pipeline by looking for known Symfony services. Users can override the detection in `config/packages/storybook/storybook.yaml`.

| Pipeline | Detection | Entrypoint |
| --- | --- | --- |
| Pentatrion Vite | `Pentatrion\ViteBundle\Service\EntrypointsLookupCollection` | `entrypoints.json` |
| Webpack Encore | `webpack_encore.entrypoint_lookup_collection` | `entrypoints.json` |
| AssetMapper | `asset_mapper.importmap.generator` | `importmap.php` and eager entrypoint imports |
| None | No service found | No assets injected |

The default entrypoint is `app`. The framework and renderer treat the returned assets as normalized values so they do not need to understand the pipeline format.

## Server backends and performance

The framework can start one of several PHP backends:

- `php` — built-in PHP server.
- `frankenphp` — preferred for local development.
- `roadrunner` — long-lived workers.
- `symfony-cli` — Symfony CLI server.
- `existing` — connect to a server that is already running.

The default `auto` setting detects the best available backend in the order above.

To keep startup fast, the framework runs `bin/console cache:warmup --env=storybook` automatically. The `storybook` environment should be kept minimal: disable sessions, tests, and any other services that are not needed for rendering components in isolation.

## Recommended release timeline

| Phase | Goal | Estimated duration |
| --- | --- | --- |
| **Alpha** | Foundation slice works in the kitchen-sink: Twig component rendering, Pentatrion Vite pipeline, `php` server. | 2–3 weeks |
| **Beta** | All asset pipelines and component adapters, plus auto-discovery behind a feature flag. | 3–4 weeks |
| **RC** | Docs, migration guide, test coverage, and community feedback. | 2–3 weeks |
| **Stable** | Merge into `next` and ship as an official Storybook framework. | 1–2 weeks |

## Open questions

1. **Webpack5 support.** The current proposal uses Vite. Should we also provide a `@storybook/symfony-webpack5` framework, or is Vite sufficient for the initial release?
2. **Symfony UX Live Components.** Live components rely on Turbo Streams and a persistent backend. How much of their interactivity can be exercised inside the Storybook canvas without a full app request lifecycle?
3. **End-to-end tests.** We need a strategy for E2E coverage that starts a real Symfony project and exercises the render endpoint. Should this be a new sandbox template or a separate CI job?
4. **Bundle repository visibility.** The Composer bundle lives in a separate repository. When should it be made public so the kitchen-sink can install it directly from Packagist?
5. **Auto-discovery.** The experimental indexer can discover Twig components from PHP classes. Should it be enabled by default once it is stable, or remain opt-in?

## Related documentation

- [Storybook for Symfony & Vite docs](../../docs/get-started/frameworks/symfony-vite.mdx)
- [Migration guide](../../docs/get-started/frameworks/symfony-vite-migration.mdx)
- [Framework README](../../code/frameworks/symfony-vite/README.md)
- [Renderer README](../../code/renderers/symfony/README.md)
- [Bundle README](https://github.com/storybookjs/storybook-symfony-bundle)
