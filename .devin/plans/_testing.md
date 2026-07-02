# Sub-plan: Testing Strategy

## Goal

Ensure the framework works correctly across Symfony versions, asset pipelines, and component types.

## Working rules

Every implementation decision and code change in this sub-plan must be grounded in the actual documentation and source available in the Storybook monorepo, the Symfony documentation, and Symfony UX documentation. Do not rely on memory or assumptions.

- **Storybook side:** Before writing or editing any Storybook-related code, read the relevant local docs in `docs/` and the existing framework/renderer packages in `code/`. Cross-check `AGENTS.md` for monorepo conventions, build commands, and testing rules.
- **Symfony side:** Before writing or editing any PHP bundle code, fetch the current Symfony documentation and Symfony UX documentation. Symfony APIs, bundle conventions, and Twig component behavior change over time; verify them every time.
- **No guessing:** If a contract, API, or behavior is not verified by the docs or source, treat it as unknown and look it up before building on it.
- **Checklists drive work:** Use the checklist in this sub-plan to track progress. Do not mark an item complete until it is actually implemented and verified.

## Unit tests

### Composer bundle

Use PHPUnit or Pest.

- Component adapter tests: each adapter renders a known component correctly.
- Asset extractor tests: each extractor returns the expected normalized collection.
- Render endpoint tests: the controller returns valid JSON for valid input and errors for invalid input.
- Indexer tests: the indexer discovers expected components.

### Storybook renderer

Use Vitest with `happy-dom` or `jsdom`.

- `renderToCanvas` tests: fetch mocking, HTML injection, asset injection.
- Stimulus lifecycle tests: disconnect and connect events fire correctly.
- Asset injection tests: scripts and styles are deduplicated and injected.
- Public type tests: TypeScript compilation of example stories.

### Storybook framework

- Vite plugin tests: server start/stop, health-check, URL injection.
- Preset tests: builder and renderer are wired correctly.

## Integration test repo

`test-storybooks/symfony-vite-kitchen-sink/` is a real Symfony project that exercises the framework.

It contains:

- Twig components with Stimulus.
- Live components.
- Plain Twig templates.
- Controller fragments.
- Examples for each asset pipeline.
- `.stories.ts` files and auto-discovery examples.

## E2E tests

Use the Storybook test-runner or Playwright to:

- Navigate to each story.
- Assert that the component renders.
- Assert that Stimulus controllers connect.
- Assert that controls update the rendered HTML.
- Assert that play functions run correctly.

## Test commands

```bash
# Unit tests
yarn test packages/symfony-renderer
yarn test packages/symfony-vite
composer test # in bundle repo

# Kitchen-sink
cd test-storybooks/symfony-vite-kitchen-sink
yarn storybook
yarn test-storybook

# Static build
yarn build-storybook
npx serve storybook-static
```

## CI

The monorepo CI should:

- Compile the new packages.
- Run type checks.
- Run unit tests.
- Build the kitchen-sink.
- Run E2E tests against the built kitchen-sink.

## Checklist

### Workflow

- [ ] Add a test for every feature before marking it complete.
- [ ] Run unit tests locally before committing.
- [ ] Run the kitchen-sink manually after every vertical slice.
- [ ] Add CI coverage for the new packages as soon as they compile.

### Composer bundle tests

- [ ] Set up PHPUnit or Pest with `composer.json` dev dependency and `phpunit.xml`.
- [ ] Write PHPUnit test: `TwigComponentAdapter` renders a Twig component with args.
- [ ] Write PHPUnit test: `LiveComponentAdapter` renders a live component with initial state.
- [ ] Write PHPUnit test: `TemplateAdapter` renders a plain Twig template.
- [ ] Write PHPUnit test: `ControllerFragmentAdapter` renders a controller fragment.
- [ ] Write PHPUnit test: `PentatrionViteExtractor` returns expected dev server URLs.
- [ ] Write PHPUnit test: `EncoreAssetExtractor` returns expected scripts and styles.
- [ ] Write PHPUnit test: `AssetMapperExtractor` returns expected importmap.
- [ ] Write PHPUnit test: `NullAssetExtractor` returns empty collection.
- [ ] Write PHPUnit test: `StorybookController::render` returns valid JSON for valid input.
- [ ] Write PHPUnit test: `StorybookController::render` returns 404 for unknown component.
- [ ] Write PHPUnit test: `StorybookController::index` returns expected component list.
- [ ] Write PHPUnit test: `StorybookController::source` returns Twig and PHP source.

### Renderer tests

- [ ] Set up `vitest.config.ts` with `happy-dom` environment.
- [ ] Write Vitest test: `renderToCanvas` fetches HTML and injects it into `canvasElement`.
- [ ] Write Vitest test: `renderToCanvas` serializes dates and objects correctly.
- [ ] Write Vitest test: `renderToCanvas` calls `showError` on HTTP error.
- [ ] Write Vitest test: Stimulus `disconnect` fires before HTML replacement.
- [ ] Write Vitest test: Stimulus `connect` fires after HTML replacement.
- [ ] Write Vitest test: asset injection appends stylesheets to `<head>`.
- [ ] Write Vitest test: asset injection injects importmap before module scripts.
- [ ] Write Vitest test: duplicate script URLs are deduplicated.
- [ ] Write Vitest test: asset cleanup removes injected tags on teardown.
- [ ] Write TypeScript type test: example story satisfies `Meta` and `StoryObj`.

### Framework tests

- [ ] Write Vitest test: Vite plugin starts `php -S` and waits for health endpoint.
- [ ] Write Vitest test: Vite plugin stops the PHP server when Vite closes.
- [ ] Write Vitest test: `core` preset resolves `@storybook/builder-vite` and `@storybook/symfony/preset`.
- [ ] Write Vitest test: framework options validation rejects missing `projectDir`.
- [ ] Write Vitest test: server auto-detection prefers FrankenPHP over `php -S`.

### Integration and E2E

- [ ] Create `test-storybooks/symfony-vite-kitchen-sink/` with `composer.json`, `package.json`, and Symfony project structure.
- [ ] Add a Twig component with Stimulus to the kitchen-sink.
- [ ] Add a Live Component to the kitchen-sink.
- [ ] Add a plain Twig template story to the kitchen-sink.
- [ ] Add a controller fragment story to the kitchen-sink.
- [ ] Add Pentatrion Vite setup to the kitchen-sink.
- [ ] Add Webpack Encore setup to the kitchen-sink.
- [ ] Add AssetMapper setup to the kitchen-sink.
- [ ] Add no-asset setup to the kitchen-sink.
- [ ] Write E2E test: open a story and assert rendered HTML contains expected text.
- [ ] Write E2E test: change a control and assert the rendered HTML updates.
- [ ] Write E2E test: run a play function that clicks a Stimulus-controlled button.
- [ ] Write E2E test: open docs page and assert Twig source is visible.
- [ ] Write E2E test: auto-discovered component appears in the sidebar.

### CI

- [ ] Add `compile` and `check` NX targets for `code/renderers/symfony` and `code/frameworks/symfony-vite`.
- [ ] Add CI step to run `yarn nx run-many -t compile` including the new packages.
- [ ] Add CI step to run `yarn nx run-many -t check` including the new packages.
- [ ] Add CI step to run renderer unit tests.
- [ ] Add CI step to run framework unit tests.
- [ ] Add CI step to run Composer bundle tests.
- [ ] Add CI step to build the kitchen-sink.
- [ ] Add CI step to run E2E tests against the kitchen-sink.
