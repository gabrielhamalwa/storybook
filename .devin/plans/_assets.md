# Sub-plan: Asset Pipeline Strategy

## Goal

Support all common Symfony asset pipelines without forcing users to migrate. The framework detects the pipeline and extracts a normalized asset description that the renderer can inject.

## Working rules

Every implementation decision and code change in this sub-plan must be grounded in the actual documentation and source available in the Storybook monorepo, the Symfony documentation, and Symfony UX documentation. Do not rely on memory or assumptions.

- **Storybook side:** Before writing or editing any Storybook-related code, read the relevant local docs in `docs/` and the existing framework/renderer packages in `code/`. Cross-check `AGENTS.md` for monorepo conventions, build commands, and testing rules.
- **Symfony side:** Before writing or editing any PHP bundle code, fetch the current Symfony documentation and Symfony UX documentation. Symfony APIs, bundle conventions, and Twig component behavior change over time; verify them every time.
- **No guessing:** If a contract, API, or behavior is not verified by the docs or source, treat it as unknown and look it up before building on it.
- **Checklists drive work:** Use the checklist in this sub-plan to track progress. Do not mark an item complete until it is actually implemented and verified.

## Supported pipelines

| Pipeline | Twig helpers | Manifest / map | Priority |
|---|---|---|---|
| Pentatrion Vite | `vite_entry_link_tags()`, `vite_entry_script_tags()` | `public/build/manifest.json` | First |
| Webpack Encore | `encore_entry_link_tags()`, `encore_entry_script_tags()` | `public/build/entrypoints.json` | Second |
| AssetMapper | `asset()`, `importmap()` | `assets/importmap.json` | Third |
| None | Manual tags | None | Fallback |

## Detection

The Composer bundle detects the pipeline by checking the container and filesystem:

1. If `Pentatrion\ViteBundle\ViteBundle` is registered and `vite_pentatrion` service exists → Pentatrion Vite.
2. If `public/build/entrypoints.json` exists and Webpack Encore bundle is registered → Webpack Encore.
3. If `assets/importmap.json` exists and AssetMapper is registered → AssetMapper.
4. Otherwise → None.

## Normalized asset format

All extractors return the same shape:

```php
class AssetCollection
{
    public function __construct(
        public readonly string $pipeline,
        public readonly array $scripts = [],     // AssetScript[]
        public readonly array $styles = [],      // AssetStyle[]
        public readonly ?array $importmap = null,
    ) {}
}

class AssetScript
{
    public function __construct(
        public readonly string $src,
        public readonly string $type = 'module',
        public readonly ?string $pipeline = null,
        public readonly bool $async = false,
        public readonly bool $defer = true,
        public readonly array $attributes = [],
    ) {}
}

class AssetStyle
{
    public function __construct(
        public readonly string $href,
        public readonly ?string $pipeline = null,
        public readonly array $attributes = [],
    ) {}
}
```

## Pentatrion Vite

In dev mode, Pentatrion Vite points to the Vite dev server. The extractor:

1. Reads the Vite dev server URL from the bundle config.
2. Reads the entry points from the manifest.
3. Returns dev server URLs for scripts and styles.
4. In production, returns the built manifest paths.

The Storybook renderer must load these scripts and coordinate with the Vite dev server for HMR.

## Webpack Encore

The extractor reads `public/build/entrypoints.json` and returns the listed CSS and JS files.

If the Encore dev server is running, the extractor returns dev server URLs instead of local paths.

## AssetMapper

The extractor reads `assets/importmap.json` and returns:

- An importmap object for the renderer to inject.
- A list of script tags for the main entry points.

The renderer injects the importmap and loads the scripts as modules.

## No pipeline

The `NullAssetExtractor` returns an empty collection. The renderer only injects the HTML. This is the fallback for projects that manage assets manually.

## Renderer injection

The renderer side is pipeline-agnostic. It receives the normalized collection and:

1. Deduplicates scripts and styles by URL.
2. Injects `<link rel="stylesheet">` tags.
3. Injects `<script type="importmap">` if present.
4. Injects `<script type="module">` tags.
5. Dispatches `DOMContentLoaded` so Stimulus connects.

## HMR

Each pipeline has its own HMR strategy:

| Pipeline | HMR behavior |
|---|---|
| Pentatrion Vite | Vite handles JS/CSS HMR; Storybook renderer re-fetches Twig HTML on story change. |
| Webpack Encore | Encore dev server handles HMR; Storybook re-fetches HTML. |
| AssetMapper | No compilation; Storybook re-fetches HTML when templates change. |
| None | Storybook re-fetches HTML when templates or story files change. |

## Checklist

### Workflow

- [x] Add or update PHPUnit tests for every bundle-side extractor feature.
- [x] Add or update Vitest tests for every renderer-side asset injection feature.
- [x] Add a kitchen-sink example for every asset pipeline supported.
- [x] Run `yarn nx compile symfony-renderer` and `yarn nx compile symfony-vite` after asset changes.

### Implementation

- [x] Create `Dto/AssetCollection.php` with `pipeline`, `scripts`, `styles`, `importmap` fields.
- [x] Create `Dto/AssetScript.php` with `src`, `type`, `async`, `defer`, `attributes` fields.
- [x] Create `Dto/AssetStyle.php` with `href`, `attributes` field.
- [x] Create `Asset/AssetExtractorInterface.php`.
- [x] Create `Asset/PentatrionViteExtractor.php` reading bundle config and `manifest.json`.
- [x] Create `Asset/EncoreAssetExtractor.php` reading `public/build/entrypoints.json`.
- [x] Create `Asset/AssetMapperExtractor.php` reading `assets/importmap.json`.
- [x] Create `Asset/NullAssetExtractor.php` returning empty collection.
- [x] Create `Asset/AssetExtractorResolver.php` checking container services and filesystem.
- [x] Add PHPUnit test: resolver picks Pentatrion Vite when service exists.
- [x] Add PHPUnit test: resolver picks Encore when entrypoints.json exists.
- [x] Add PHPUnit test: resolver picks AssetMapper when importmap.json exists.
- [x] Add PHPUnit test: resolver falls back to Null when no pipeline detected.
- [x] Create renderer `src/assets/index.ts` with TypeScript asset types.
- [x] Create renderer `src/assets/inject.ts` that injects `<link>`, `<script type="importmap">`, and `<script type="module">`.
- [x] Implement URL deduplication in `inject.ts`.
- [x] Implement cleanup of injected assets on teardown.
- [x] Add Vitest test: stylesheets are injected into `<head>`.
- [x] Add Vitest test: importmap is injected before module scripts.
- [x] Add Vitest test: duplicate script URLs are not injected twice.
- [x] Add kitchen-sink example: Pentatrion Vite project.
- [x] Add kitchen-sink example: Webpack Encore project.
- [x] Add kitchen-sink example: AssetMapper project.
- [x] Add kitchen-sink example: no pipeline project.
