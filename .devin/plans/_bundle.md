# Sub-plan: Composer Bundle `storybook/symfony-bundle`

## Goal

Provide the PHP side of the Storybook Symfony integration: render components in isolation, expose metadata, and extract assets for the Storybook renderer.

## Working rules

Every implementation decision and code change in this sub-plan must be grounded in the actual documentation and source available in the Storybook monorepo, the Symfony documentation, and Symfony UX documentation. Do not rely on memory or assumptions.

- **Storybook side:** Before writing or editing any Storybook-related code, read the relevant local docs in `docs/` and the existing framework/renderer packages in `code/`. Cross-check `AGENTS.md` for monorepo conventions, build commands, and testing rules.
- **Symfony side:** Before writing or editing any PHP bundle code, fetch the current Symfony documentation and Symfony UX documentation. Symfony APIs, bundle conventions, and Twig component behavior change over time; verify them every time.
- **No guessing:** If a contract, API, or behavior is not verified by the docs or source, treat it as unknown and look it up before building on it.
- **Checklists drive work:** Use the checklist in this sub-plan to track progress. Do not mark an item complete until it is actually implemented and verified.

## Location

`/Users/ghamalwa/WebstormProjects/storybook-symfony-bundle/` (separate Composer package outside the Storybook monorepo).

## Required files

The Composer bundle needs these files at minimum:

- `composer.json` — package name `storybook/symfony-bundle`, PSR-4 autoloading, Symfony version constraints, dev dependencies.
- `phpunit.xml` — PHPUnit configuration.
- `README.md` — installation, configuration, and endpoint documentation.
- `src/StorybookBundle.php` — bundle class.
- `src/DependencyInjection/StorybookExtension.php` — DI extension.
- `src/DependencyInjection/Configuration.php` — bundle configuration tree.
- `src/Controller/StorybookController.php` — render, index, source, and health endpoints.
- `src/Component/*` — component adapters.
- `src/Asset/*` — asset extractors.
- `src/Indexer/*` — component discovery.
- `src/Dto/*` — request/response/data objects.

## Test project

The bundle does not need a Storybook sandbox. It needs a real Symfony project to test against. The canonical test project is `test-storybooks/symfony-vite-kitchen-sink/` in the Storybook monorepo.

A Storybook sandbox (`../storybook-sandboxes/`) is a generated project used for CI parity across many templates. We add a Symfony sandbox template only after the kitchen-sink is stable.

## Package structure

```text
storybook-symfony-bundle/
├── composer.json
├── README.md
├── src/
│   ├── Controller/
│   │   └── StorybookController.php
│   ├── DependencyInjection/
│   │   ├── StorybookExtension.php
│   │   └── Configuration.php
│   ├── StorybookBundle.php
│   ├── StorybookKernel.php
│   ├── Component/
│   │   ├── ComponentAdapterInterface.php
│   │   ├── TwigComponentAdapter.php
│   │   ├── LiveComponentAdapter.php
│   │   ├── TemplateAdapter.php
│   │   └── ControllerFragmentAdapter.php
│   ├── Asset/
│   │   ├── AssetExtractorInterface.php
│   │   ├── EncoreAssetExtractor.php
│   │   ├── AssetMapperExtractor.php
│   │   ├── PentatrionViteExtractor.php
│   │   └── NullAssetExtractor.php
│   ├── Indexer/
│   │   └── ComponentIndexer.php
│   └── Dto/
│       ├── RenderRequest.php
│       ├── RenderResponse.php
│       └── ComponentMetadata.php
```

## Render endpoint

```php
#[Route('/_storybook/render/{id}', methods: ['POST'], defaults: ['_locale' => null])]
public function render(string $id, Request $request): JsonResponse;
```

Request body:

```json
{
  "args": { "label": "Save", "variant": "primary" },
  "globals": { "locale": "en" }
}
```

Response body:

```json
{
  "html": "<button data-controller=\"button\" ...>Save</button>",
  "assets": {
    "scripts": [
      { "src": "/build/app.js", "type": "module", "pipeline": "vite" }
    ],
    "styles": [
      { "href": "/build/app.css", "pipeline": "vite" }
    ],
    "importmap": {
      "imports": { "@hotwired/stimulus": "/build/vendor/stimulus.js" }
    }
  },
  "metadata": {
    "component": "Button",
    "template": "templates/components/Button.html.twig",
    "stimulusControllers": ["button"]
  }
}
```

## Component adapters

Each adapter implements `ComponentAdapterInterface::render(RenderRequest $request): string`.

| Adapter | Input identifier | Behavior |
|---|---|---|
| `TwigComponentAdapter` | `Button` | Uses `ux.twig_component` to render `#[AsTwigComponent('Button')]` with args. |
| `LiveComponentAdapter` | `Live:Button` or `Button` with `live: true` | Renders a live component, returning initial HTML + metadata. |
| `TemplateAdapter` | `templates/components/Button.html.twig` | Direct Twig render with args. |
| `ControllerFragmentAdapter` | `App\Controller\ButtonController::fragment` | Renders a controller action and returns a fragment. |

The controller dispatches to the right adapter based on the story metadata.

## Asset extractors

Each extractor implements `AssetExtractorInterface::extract(ComponentMetadata $metadata): AssetCollection`.

The bundle auto-detects which pipeline is installed by checking for known services:

- `vite_pentatrion` service → `PentatrionViteExtractor`
- `webpack_encore` entrypoints.json → `EncoreAssetExtractor`
- `assets.asset_mapper` service → `AssetMapperExtractor`
- none → `NullAssetExtractor`

Extractors return a normalized `AssetCollection` so the renderer does not need to know the pipeline.

## Indexer endpoint

```php
#[Route('/_storybook/index', methods: ['GET'])]
public function index(): JsonResponse;
```

Returns a list of discoverable components for the experimental Storybook indexer.

```json
{
  "components": [
    {
      "id": "Button",
      "type": "twig_component",
      "title": "Components/Button",
      "template": "templates/components/Button.html.twig",
      "class": "App\\Twig\\Components\\Button",
      "props": [
        { "name": "label", "type": "string", "required": true },
        { "name": "variant", "type": "string", "default": "primary" }
      ]
    }
  ]
}
```

## Source endpoint

```php
#[Route('/_storybook/source/{id}', methods: ['GET'])]
public function source(string $id): JsonResponse;
```

Returns the Twig template source and the component class source for the docs panel.

## Isolated kernel

The bundle provides a `StorybookKernel` helper that can be used to boot a minimal kernel programmatically. The framework scaffolds `config/packages/storybook/` to include only:

- `framework.yaml` — minimal router, cache
- `twig.yaml`
- `twig_component.yaml`
- `stimulus.yaml`
- `assets.yaml` if AssetMapper

The bundle never triggers a full `cache:clear` automatically. The Storybook framework pre-warms the cache once after install.

## Checklist

### Workflow

- [ ] Write `storybook-symfony-bundle/README.md` before implementing the bundle.
- [ ] Add or update a PHPUnit test for every bundle feature implemented.
- [ ] Run `composer test` in the bundle directory after each bundle change.
- [ ] Run `cd code && yarn fmt:write` before committing any monorepo file changes.

### Implementation

- [ ] Create `composer.json` with PSR-4 autoloading for `Storybook\StorybookBundle`.
- [ ] Create `StorybookBundle.php` and `DependencyInjection/StorybookExtension.php`.
- [ ] Add `Configuration.php` for bundle config (environment, project_dir, public_dir).
- [ ] Add `GET /_storybook/health` route returning `{"status":"ok"}`.
- [ ] Add `POST /_storybook/render/{id}` route and `StorybookController::render`.
- [ ] Add `GET /_storybook/index` route and `StorybookController::index`.
- [ ] Add `GET /_storybook/source/{id}` route and `StorybookController::source`.
- [ ] Create `Dto/RenderRequest.php` with `args` and `globals` fields.
- [ ] Create `Dto/RenderResponse.php` with `html`, `assets`, `metadata` fields.
- [ ] Create `Dto/ComponentMetadata.php` and `Dto/AssetCollection.php`.
- [ ] Create `Dto/AssetScript.php` and `Dto/AssetStyle.php`.
- [ ] Create `Component/ComponentAdapterInterface.php`.
- [ ] Create `Component/TwigComponentAdapter.php` using `ux.twig_component` service.
- [ ] Create `Component/LiveComponentAdapter.php` using `ux.live_component` service.
- [ ] Create `Component/TemplateAdapter.php` using `twig` service.
- [ ] Create `Component/ControllerFragmentAdapter.php` using HTTP sub-request.
- [ ] Create `Component/ComponentResolver.php` that picks the right adapter from story metadata.
- [ ] Create `Asset/AssetExtractorInterface.php`.
- [ ] Create `Asset/PentatrionViteExtractor.php` reading `public/build/manifest.json`.
- [ ] Create `Asset/EncoreAssetExtractor.php` reading `public/build/entrypoints.json`.
- [ ] Create `Asset/AssetMapperExtractor.php` reading `assets/importmap.json`.
- [ ] Create `Asset/NullAssetExtractor.php` returning empty collection.
- [ ] Create `Asset/AssetExtractorResolver.php` that auto-detects the pipeline.
- [ ] Create `Indexer/ComponentIndexer.php` that scans `src/Twig/Components/` and `templates/components/`.
- [ ] Add PHP reflection to infer `#[AsTwigComponent]` constructor/property types.
- [ ] Add Twig parser to read `{% props %}` block.
- [ ] Add PHPUnit/Pest test suite with `phpunit.xml`.
- [ ] Write PHPUnit test: `TwigComponentAdapter` renders a known component.
- [ ] Write PHPUnit test: `PentatrionViteExtractor` returns expected scripts/styles.
- [ ] Write PHPUnit test: `EncoreAssetExtractor` returns expected scripts/styles.
- [ ] Write PHPUnit test: `AssetMapperExtractor` returns expected importmap.
- [ ] Write PHPUnit test: `StorybookController::render` returns valid JSON.
- [ ] Write PHPUnit test: `StorybookController::index` returns expected component list.
- [ ] Write bundle `README.md` with install, configure, and usage instructions.
