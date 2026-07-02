# Storybook Symfony/Twig Framework — Implementation Plan

## Goal

Add first-class, native Storybook support for Symfony/Twig applications to the Storybook monorepo, with the intent of shipping it as an official framework.

The integration must:

- Follow Storybook’s framework conventions (renderer + framework + builder wiring).
- Feel native to Symfony users: Twig components, Stimulus controllers, Symfony UX Live Components, and common asset pipelines all work out of the box.
- Be fast enough for day-to-day development on large, existing Symfony repos.
- Avoid requiring users to run a separate terminal for the Symfony backend.

## Working rules

Every implementation decision and code change must be grounded in the actual documentation and source available in this repository and the Symfony ecosystem. Do not rely on memory or assumptions.

- **Storybook side:** Before writing or editing any Storybook-related code, read the relevant local docs in `docs/` and the existing framework/renderer packages in `code/`. Cross-check `AGENTS.md` for monorepo conventions, build commands, and testing rules.
- **Symfony side:** Before writing or editing any PHP bundle code, fetch the current Symfony documentation and Symfony UX documentation. Symfony APIs, bundle conventions, and Twig component behavior change over time; verify them every time.
- **No guessing:** If a contract, API, or behavior is not verified by the docs or source, treat it as unknown and look it up before building on it.
- **Checklists drive work:** Use the checklists in this plan and the sub-plans to track progress. Do not mark an item complete until it is actually implemented and verified.

## Development workflow

The Storybook contribute docs recommend writing documentation before code. We follow that here, plus a test-as-we-go approach that matches the monorepo conventions in `AGENTS.md`.

1. **README-first.** Write or update the user-facing README and docs before implementing the feature. This keeps the API clear and surfaces bad decisions early.
2. **Tests with every feature.** Add unit tests, renderer tests, or kitchen-sink stories alongside the implementation, not after. A feature is not done until a test or story proves it works.
3. **Compile after changes.** Run `yarn nx compile <nx-project-name>` for the affected package after each meaningful change.
4. **Type-check the repo.** Run `yarn nx run-many -t check` before committing to catch cross-package TypeScript errors.
5. **Format and lint.** Run `cd code && yarn fmt:write` and `yarn --cwd code lint:js:cmd <path> --fix` before any commit.
6. **Kitchen-sink is the integration test.** The `test-storybooks/symfony-vite-kitchen-sink/` project is the canonical real-world test. Every feature must be runnable there.
7. **Sandboxes are generated later.** Storybook sandboxes (`../storybook-sandboxes/`) are generated from templates for CI parity. We add a template for Symfony only after the kitchen-sink is stable.
8. **AGENTS.md is the source of truth.** Follow it for commits, PRs, test mocking, and global stubbing.

## Decision tree

| Decision | Choice | Rationale |
|---|---|---|
| Repository location | Storybook monorepo | Goal is official support; reuse existing tooling, test kitchens, and release process. |
| Builder (first) | Vite | Modern default; aligns with Pentatrion Vite and future Storybook test tooling. Webpack5 later. |
| Renderer/framework names | `@storybook/symfony` + `@storybook/symfony-vite` | Matches monorepo naming conventions. |
| Composer bundle name | `storybook/symfony-bundle` | Standard Composer namespace. |
| PHP server default | `php -S` | Zero dependencies beyond PHP. Fast paths: FrankenPHP / RoadRunner. |
| Symfony environment | Isolated `storybook` environment | Avoids compiling the full application container. Drop-in config scaffolded by the framework. |
| Story format default | `.stories.ts` | Full CSF/TypeScript support, controls, play functions, docs. |
| Auto-discovery | Experimental indexer | Opt-in indexer scans Twig/PHP components and generates story entries. |
| Asset pipeline support | Adapter-based: Pentatrion Vite first, then Webpack Encore, AssetMapper, none | Matches real-world Symfony diversity. |
| Component scope | Static Twig + Stimulus + Live Components + plain templates + controller fragments | Adapter-based so all variants are supported without repo drift. |
| Preview boundary | Storybook iframe | Removing the iframe is not supported by Storybook core. We own the DOM inside the iframe. |

## Package structure

```text
storybook/                          (monorepo)
├── code/
│   ├── renderers/symfony/          # @storybook/symfony
│   │   ├── README.md
│   │   ├── package.json
│   │   ├── project.json            # NX targets: compile, check
│   │   ├── build-config.ts         # browser + node entry points
│   │   ├── preset.js               # re-export dist/preset.js
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── entry-preview.ts
│   │       ├── entry-preview-docs.ts
│   │       ├── render.ts
│   │       ├── public-types.ts
│   │       ├── types.ts
│   │       ├── preset.ts
│   │       ├── globals.ts
│   │       └── assets/           # client-side asset adapters
│   └── frameworks/symfony-vite/   # @storybook/symfony-vite
│       ├── README.md
│       ├── package.json
│       ├── project.json            # NX targets: compile, check
│       ├── build-config.ts         # browser + node entry points
│       ├── preset.js               # re-export dist/preset.js
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
│           ├── index.ts
│           ├── preset.ts
│           ├── types.ts
│           └── vite-plugin.ts
├── test-storybooks/
│   └── symfony-vite-kitchen-sink/ # test repo
│       ├── composer.json
│       ├── package.json
│       ├── .storybook/
│       ├── config/packages/storybook/
│       ├── src/Twig/Components/
│       ├── templates/components/
│       └── assets/
├── docs/
│   └── get-started/frameworks/symfony-vite.mdx
└── .devin/plans/                  # this directory

phpstorm-projects/                 (separate workspace)
└── storybook-symfony-bundle/      # Composer package
    ├── composer.json
    ├── phpunit.xml
    ├── README.md
    └── src/
        ├── StorybookBundle.php
        ├── DependencyInjection/
        ├── Controller/StorybookController.php
        ├── StorybookKernel.php
        ├── Component/             # component adapters
        ├── Asset/                 # asset extractors
        ├── Indexer/               # component discovery
        └── Dto/                   # request/response objects
```

### Monorepo workspace

The root `package.json` already includes `code/frameworks/*` and `code/renderers/*` in its workspaces. No root workspace change is needed. NX will discover the new packages via `project.json` files.

## Runtime architecture

```text
User runs: yarn storybook

@storybook/symfony-vite
    ↓
starts Vite dev server
    ↓
starts PHP server (php -S default, FrankenPHP/RoadRunner opt-in)
    ↓
Symfony kernel boots in `storybook` environment
    ↓
user clicks a story
    ↓
renderer calls POST /_storybook/render/{componentId}
    ↓
storybook-symfony-bundle
    ↓
ComponentAdapter renders the component
AssetExtractor returns normalized assets
    ↓
returns { html, assets, metadata, stimulusControllers }
    ↓
renderer injects HTML + assets into the preview iframe
    ↓
Stimulus controllers connect
```

## Vertical slices

We build everything, but in order so each slice is end-to-end and testable.

1. **Foundation slice**
   - Renderer skeleton (`renderToCanvas`, types, public types)
   - Framework skeleton (preset wiring to `@storybook/builder-vite`)
   - Composer bundle skeleton (render endpoint, isolated kernel)
   - `php -S` server management
   - Static Twig component + Stimulus
   - Pentatrion Vite asset pipeline
   - `.stories.ts` format

2. **Asset pipeline expansion**
   - Webpack Encore support
   - AssetMapper support
   - No-asset / custom support

3. **Component expansion**
   - Symfony UX Live Components
   - Plain Twig templates
   - Controller fragments

4. **Discovery and docs**
   - Experimental auto-discovery indexer
   - Source extraction for docs
   - Autodocs support

5. **Performance and polish**
   - FrankenPHP/RoadRunner fast path
   - Container cache pre-warming
   - HMR coordination

6. **Testing and release**
   - Unit tests for renderer
   - Kitchen-sink test repo
   - E2E and test-runner coverage
   - Documentation and migration guide

## Sub-plans

- [`_bundle.md`](./_bundle.md) — Composer bundle, PHP kernel, render endpoints, component adapters, asset extractors.
- [`_renderer.md`](./_renderer.md) — Storybook renderer, `renderToCanvas`, Stimulus lifecycle, public types.
- [`_framework.md`](./_framework.md) — Storybook framework package, preset, Vite integration, server management.
- [`_assets.md`](./_assets.md) — Asset pipeline strategy for Pentatrion Vite, Webpack Encore, AssetMapper, and none.
- [`_stories.md`](./_stories.md) — Story format, CSF types, experimental auto-discovery indexer.
- [`_php-server.md`](./_php-server.md) — PHP server options, default, fast paths, lifecycle management.
- [`_documentation.md`](./_documentation.md) — README, user docs, release plan, migration path.
- [`_testing.md`](./_testing.md) — Unit tests, kitchen-sink, E2E, test-runner, and CI.

## Checklist

### Workflow

- [ ] Write `code/frameworks/symfony-vite/README.md` before any framework code.
- [ ] Write `code/renderers/symfony/README.md` before any renderer code.
- [ ] Write `storybook-symfony-bundle/README.md` before any bundle code.
- [ ] Add a regression test, unit test, or kitchen-sink story for every feature implemented.
- [ ] Run `yarn nx compile <nx-project-name>` after each package change.
- [ ] Run `yarn nx run-many -t check` before committing.
- [ ] Run `cd code && yarn fmt:write` before committing.
- [ ] Run `yarn --cwd code lint:js:cmd <path> --fix` before committing.

### Phase 1: Foundation

- [ ] Create `code/renderers/symfony/` with `README.md`, `package.json`, `project.json`, `build-config.ts`, `tsconfig.json`, `vitest.config.ts`, `preset.js`, and `src/`.
- [ ] Create `code/frameworks/symfony-vite/` with `README.md`, `package.json`, `project.json`, `build-config.ts`, `tsconfig.json`, `vitest.config.ts`, `preset.js`, and `src/`.
- [ ] Create `storybook-symfony-bundle/` Composer package with `composer.json`, `phpunit.xml`, `src/`, and `README.md`.
- [ ] Verify the root `package.json` workspaces pick up the new packages (no root change needed).
- [ ] Verify NX discovers `code/renderers/symfony` and `code/frameworks/symfony-vite` via `project.json`.
- [ ] Create `StorybookBundle` PHP class and DI extension.
- [ ] Add `GET /_storybook/health` endpoint returning `{"status":"ok"}`.
- [ ] Implement `php -S` start/stop in the Vite plugin and wire it into `configureServer`/`close`.
- [ ] Implement health-check polling until the PHP server responds.
- [ ] Inject the PHP server URL into the preview bundle via `import.meta.env`.
- [ ] Implement `renderToCanvas` in `@storybook/symfony` that fetches HTML from the PHP server.
- [ ] Implement `render` placeholder so CSF decorators work.
- [ ] Implement `SymfonyRenderer` type and public `Meta`/`StoryObj` types.
- [ ] Implement `TwigComponentAdapter` in the bundle that renders `#[AsTwigComponent('Button')]`.
- [ ] Implement `PentatrionViteExtractor` in the bundle and matching client-side asset injection.
- [ ] Define `.stories.ts` story format and verify TypeScript types compile.
- [ ] Create `test-storybooks/symfony-vite-kitchen-sink/` with `composer.json`, `package.json`, `.storybook/`, `config/packages/storybook/`, one Twig component, and one `.stories.ts` file.
- [ ] Verify `yarn storybook` starts the kitchen-sink and renders a story end-to-end.

### Phase 2: Asset pipelines

- [ ] Implement `EncoreAssetExtractor` in the bundle.
- [ ] Implement Encore client-side asset injection in the renderer.
- [ ] Add Encore example to the kitchen-sink.
- [ ] Implement `AssetMapperExtractor` in the bundle.
- [ ] Implement AssetMapper importmap injection in the renderer.
- [ ] Add AssetMapper example to the kitchen-sink.
- [ ] Implement `NullAssetExtractor` fallback.
- [ ] Add no-asset/manual example to the kitchen-sink.
- [ ] Implement pipeline auto-detection in the bundle.

### Phase 3: Component types

- [ ] Implement `LiveComponentAdapter` for Symfony UX Live Components.
- [ ] Add Live Component example to the kitchen-sink.
- [ ] Implement `TemplateAdapter` for plain Twig templates.
- [ ] Add plain template example to the kitchen-sink.
- [ ] Implement `ControllerFragmentAdapter` for controller fragments.
- [ ] Add controller fragment example to the kitchen-sink.
- [ ] Implement component adapter selection logic in `StorybookController`.

### Phase 4: Discovery and docs

- [ ] Implement `GET /_storybook/index` endpoint returning component metadata.
- [ ] Implement `experimental_indexer` in the renderer preset that calls the index endpoint.
- [ ] Implement virtual story module generation for auto-discovered components.
- [ ] Implement `GET /_storybook/source/{id}` endpoint returning Twig source.
- [ ] Wire source endpoint into docs parameters so the docs panel shows Twig source.
- [ ] Implement argType inference from `#[AsTwigComponent]` properties and Twig `{% props %}`.
- [ ] Enable Autodocs for `.stories.ts` files.

### Phase 5: Performance

- [ ] Scaffold `config/packages/storybook/` environment with minimal framework/twig/twig_component/stimulus config.
- [ ] Add post-install script to pre-warm `var/cache/storybook/`.
- [ ] Implement FrankenPHP server start/stop in the Vite plugin.
- [ ] Implement RoadRunner server start/stop in the Vite plugin.
- [ ] Implement Symfony CLI server start/stop in the Vite plugin.
- [ ] Implement "existing server" mode.
- [ ] Implement server auto-detection (`frankenphp` → `rr` → `symfony` → `php`).
- [ ] Add HMR coordination: re-render story when Twig templates or story files change.

### Phase 6: Documentation and release

- [ ] Write `code/frameworks/symfony-vite/README.md`.
- [ ] Write `code/renderers/symfony/README.md`.
- [ ] Write `storybook-symfony-bundle/README.md`.
- [ ] Write `docs/get-started/frameworks/symfony-vite.mdx`.
- [ ] Write migration guide for users coming from iframe-based integrations.
- [ ] Add package metadata (keywords, homepage, bugs, repository).
- [ ] Prepare RFC for the Storybook core team.
- [ ] Plan alpha/beta/RC release schedule.

### Phase 7: Testing

- [ ] Set up PHPUnit or Pest in the Composer bundle.
- [ ] Write PHPUnit test for `TwigComponentAdapter`.
- [ ] Write PHPUnit test for `PentatrionViteExtractor`.
- [ ] Write PHPUnit test for `EncoreAssetExtractor`.
- [ ] Write PHPUnit test for `AssetMapperExtractor`.
- [ ] Write PHPUnit test for `StorybookController::render`.
- [ ] Write Vitest tests for `renderToCanvas` with mocked fetch.
- [ ] Write Vitest tests for Stimulus disconnect/connect lifecycle.
- [ ] Write Vitest tests for asset injection helpers.
- [ ] Write Vitest tests for the Vite plugin server lifecycle.
- [ ] Write TypeScript type tests for public story types.
- [ ] Add E2E test that opens a story in the kitchen-sink and asserts rendered HTML.
- [ ] Add E2E test for a play function that clicks a Stimulus-controlled button.
- [ ] Add monorepo CI checks for the new packages.
