# Sub-plan: Storybook Renderer `@storybook/symfony`

## Goal

Define the browser-side rendering layer for Symfony/Twig stories: how Storybook turns a story definition and args into DOM inside the preview iframe.

## Working rules

Every implementation decision and code change in this sub-plan must be grounded in the actual documentation and source available in the Storybook monorepo, the Symfony documentation, and Symfony UX documentation. Do not rely on memory or assumptions.

- **Storybook side:** Before writing or editing any Storybook-related code, read the relevant local docs in `docs/` and the existing framework/renderer packages in `code/`. Cross-check `AGENTS.md` for monorepo conventions, build commands, and testing rules.
- **Symfony side:** Before writing or editing any PHP bundle code, fetch the current Symfony documentation and Symfony UX documentation. Symfony APIs, bundle conventions, and Twig component behavior change over time; verify them every time.
- **No guessing:** If a contract, API, or behavior is not verified by the docs or source, treat it as unknown and look it up before building on it.
- **Checklists drive work:** Use the checklist in this sub-plan to track progress. Do not mark an item complete until it is actually implemented and verified.

## Location

`code/renderers/symfony/` in the Storybook monorepo.

## Required files

Every new renderer package in the monorepo needs these files at minimum:

- `README.md` — user-facing quick start and API summary.
- `package.json` — name `@storybook/symfony`, exports, dependencies, peer dependencies.
- `project.json` — NX project with `compile` and `check` targets.
- `build-config.ts` — browser entries (`index.ts`, `entry-preview.ts`, `entry-preview-docs.ts`) and node entries (`preset.ts`).
- `preset.js` — re-export `dist/preset.js` so Storybook can load the preset before compilation.
- `tsconfig.json` — extends `../../tsconfig.json`, includes `src/**/*`.
- `vitest.config.ts` — extends `../../vitest.shared.ts`.
- `src/index.ts` — imports `globals.ts` and re-exports public types.
- `src/entry-preview.ts` — exports `render`, `renderToCanvas`, and `parameters`.
- `src/entry-preview-docs.ts` — optional docs-specific annotations.
- `src/preset.ts` — server-side preset with `previewAnnotations` and `experimental_indexers`.
- `src/globals.ts` — sets `STORYBOOK_ENV = 'symfony'`.
- `src/render.ts` — `render` and `renderToCanvas` implementation.
- `src/types.ts` — `SymfonyRenderer` type extending `WebRenderer`.
- `src/public-types.ts` — `Meta`, `StoryObj`, `StoryFn`, `Decorator`, `StoryContext`, `Preview`.
- `src/assets/` — client-side asset injection helpers.

## Package structure

```text
code/renderers/symfony/
├── package.json
├── project.json
├── build-config.ts
├── preset.js
├── tsconfig.json
└── src/
    ├── index.ts
    ├── entry-preview.ts
    ├── render.ts
    ├── public-types.ts
    ├── types.ts
    ├── preset.ts
    ├── globals.ts
    └── assets/
        ├── index.ts
        ├── inject.ts
        ├── encore.ts
        ├── assetMapper.ts
        ├── pentatrionVite.ts
        └── none.ts
```

## `renderToCanvas`

The core function is `renderToCanvas` from `storybook/internal/types`:

```ts
export function renderToCanvas(
  context: RenderContext<SymfonyRenderer>,
  canvasElement: HTMLElement
): Promise<void | TeardownRenderToCanvas>;
```

Responsibilities:

1. Read the Symfony server URL and component id from story context.
2. Serialize args for the HTTP request (dates to ISO strings, objects to JSON).
3. Call the PHP render endpoint.
4. Inject returned HTML into `canvasElement`.
5. Inject returned styles and scripts.
6. Initialize or reconnect Stimulus controllers.
7. Return a teardown function that disconnects Stimulus before the next render.

## `render` and `storyFn`

For CSF compatibility, the renderer still exports a `render` function:

```ts
export const render: ArgsStoryFn<SymfonyRenderer> = (args, context) => {
  // The actual render is async and happens in renderToCanvas.
  // Return a placeholder or the component id.
  return { componentId: context.component };
};
```

`renderToCanvas` calls `storyFn()` to honor decorators and addon wrappers, then uses the component id from the context to request the real HTML.

## Stimulus lifecycle

Stimulus controllers listen for `DOMContentLoaded` to connect. We must manage this explicitly because Storybook reuses the same document for every story.

Strategy:

1. Before replacing HTML, dispatch a synthetic `disconnect` event or manually call `Stimulus.getApplication().unload()` for the canvas subtree.
2. Replace `canvasElement.innerHTML` with the new HTML.
3. Re-inject any required scripts and styles.
4. Dispatch `DOMContentLoaded` on the document to trigger Stimulus `connect()`.
5. Store a reference to the loaded Stimulus application so we can unload it on teardown.

If Stimulus is available globally, we can use the public API. If the project uses a custom Stimulus application, we need the bundle to expose its identifier in the response metadata.

## Asset injection helpers

The renderer receives normalized assets from the bundle and injects them into the preview document:

- Stylesheets are appended to `<head>`.
- Module scripts are appended to `<head>` or a dedicated container.
- Importmaps are injected before any module scripts.
- Scripts are deduplicated by URL so re-renders do not reload them.

Asset helpers are pipeline-specific only in how they read manifests, not in how they inject.

## Public types

```ts
export type Meta<TArgs = Args> = ComponentAnnotations<SymfonyRenderer, TArgs>;
export type StoryFn<TArgs = Args> = AnnotatedStoryFn<SymfonyRenderer, TArgs>;
export type StoryObj<TArgs = Args> = StoryAnnotations<SymfonyRenderer, TArgs>;
export type Decorator<TArgs = StrictArgs> = DecoratorFunction<SymfonyRenderer, TArgs>;
export type StoryContext<TArgs = StrictArgs> = GenericStoryContext<SymfonyRenderer, TArgs>;
export type Preview = ProjectAnnotations<SymfonyRenderer>;
```

Stories should be typed like:

```ts
import type { Meta, StoryObj } from '@storybook/symfony-vite';

const meta = {
  component: 'Button',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { label: 'Save', variant: 'primary' },
};
```

## Preset / server-side

The renderer preset adds `experimental_indexers` and `previewAnnotations`:

```ts
export const previewAnnotations: PresetProperty<'previewAnnotations'> = async (input = [], options) => {
  return [...input, fileURLToPath(import.meta.resolve('@storybook/symfony/entry-preview'))];
};

export const experimental_indexers: PresetProperty<'experimental_indexers'> = (existingIndexers) => [
  // optional auto-discovery indexer
  ...(existingIndexers || []),
];
```

The auto-discovery indexer is documented in `_stories.md`.

## Checklist

### Workflow

- [ ] Write `code/renderers/symfony/README.md` before implementing the renderer.
- [ ] Add or update a unit test for every renderer feature implemented.
- [ ] Run `yarn nx compile symfony-renderer` after each renderer change.
- [ ] Run `yarn nx run-many -t check` before committing renderer changes.
- [ ] Run `cd code && yarn fmt:write` before committing renderer changes.

### Implementation

- [ ] Create `code/renderers/symfony/package.json` with dependencies on `@storybook/global`, `ts-dedent`, and `storybook` peer.
- [ ] Create `code/renderers/symfony/project.json` with `compile` and `check` targets.
- [ ] Create `code/renderers/symfony/build-config.ts` matching other renderer packages.
- [ ] Create `code/renderers/symfony/tsconfig.json`.
- [ ] Create `src/types.ts` with `SymfonyRenderer` extending `WebRenderer`.
- [ ] Create `src/public-types.ts` exporting `Meta`, `StoryObj`, `StoryFn`, `Decorator`, `StoryContext`, `Preview`.
- [ ] Create `src/globals.ts` setting `globalThis.STORYBOOK_ENV = 'symfony'`.
- [ ] Create `src/index.ts` importing `globals.ts` and re-exporting public types.
- [ ] Create `src/entry-preview.ts` exporting `render`, `renderToCanvas`, and `parameters`.
- [ ] Create `src/preset.ts` exporting `previewAnnotations` and `experimental_indexers`.
- [ ] Implement `src/render.ts` `render` function returning component id placeholder.
- [ ] Implement `src/render.ts` `renderToCanvas` that reads server URL from `import.meta.env`.
- [ ] Implement `renderToCanvas` arg serialization (dates, objects, arrays).
- [ ] Implement `renderToCanvas` POST request to `/_storybook/render/{id}`.
- [ ] Implement `renderToCanvas` HTML injection via `canvasElement.innerHTML`.
- [ ] Implement `renderToCanvas` error handling via `showError`.
- [ ] Create `src/assets/index.ts` with normalized asset types.
- [ ] Create `src/assets/inject.ts` that injects stylesheets, importmap, and scripts.
- [ ] Implement script/style deduplication by URL in `inject.ts`.
- [ ] Create `src/assets/pentatrionVite.ts` for Vite dev server URL handling.
- [ ] Create `src/assets/encore.ts` for Encore entrypoint loading.
- [ ] Create `src/assets/assetMapper.ts` for importmap injection.
- [ ] Create `src/assets/none.ts` fallback.
- [ ] Implement Stimulus disconnect before replacing HTML.
- [ ] Implement Stimulus connect after injecting HTML via `simulateDOMContentLoaded`.
- [ ] Implement `TeardownRenderToCanvas` cleanup function.
- [ ] Add `vitest.config.ts` using `happy-dom` or `jsdom` environment.
- [ ] Write Vitest test: `renderToCanvas` fetches and injects HTML.
- [ ] Write Vitest test: `renderToCanvas` calls `showError` on invalid response.
- [ ] Write Vitest test: Stimulus disconnect/connect fire in correct order.
- [ ] Write Vitest test: asset injection deduplicates scripts.
- [ ] Write TypeScript test: example story compiles with `Meta`/`StoryObj`.
