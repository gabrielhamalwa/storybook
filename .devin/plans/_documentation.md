# Sub-plan: Documentation and Release

## Goal

Document the framework for users and contributors, and plan the release path into official Storybook.

## Working rules

Every implementation decision and code change in this sub-plan must be grounded in the actual documentation and source available in the Storybook monorepo, the Symfony documentation, and Symfony UX documentation. Do not rely on memory or assumptions.

- **Storybook side:** Before writing or editing any Storybook-related code, read the relevant local docs in `docs/` and the existing framework/renderer packages in `code/`. Cross-check `AGENTS.md` for monorepo conventions, build commands, and testing rules.
- **Symfony side:** Before writing or editing any PHP bundle code, fetch the current Symfony documentation and Symfony UX documentation. Symfony APIs, bundle conventions, and Twig component behavior change over time; verify them every time.
- **No guessing:** If a contract, API, or behavior is not verified by the docs or source, treat it as unknown and look it up before building on it.
- **Checklists drive work:** Use the checklist in this sub-plan to track progress. Do not mark an item complete until it is actually implemented and verified.

## User-facing documentation

### README in the framework package

`code/frameworks/symfony-vite/README.md` must contain:

- What the framework does.
- Requirements (PHP, Symfony, Node, Vite).
- Installation instructions:
  - `composer require storybook/symfony-bundle`
  - `yarn add -D @storybook/symfony-vite`
  - `npx storybook add @storybook/symfony-vite`
- Quick start example.
- Configuration reference.
- Troubleshooting.

### Docs site page

`docs/get-started/frameworks/symfony-vite.mdx` should cover:

- Setting up a new Symfony project.
- Writing `.stories.ts` files.
- Using the auto-discovery indexer.
- Supported component types.
- Supported asset pipelines.
- Performance tips (FrankenPHP, container cache).

### Migration guide

For users coming from existing Symfony/Storybook iframe integrations:

- How to remove custom iframe patches.
- How to migrate `.stories.json` files to `.stories.ts`.
- How to configure the `storybook` Symfony environment.

## Contributor documentation

- Architecture overview in `.devin/plans/README.md`.
- How to run the kitchen-sink.
- How to test the Composer bundle.
- How to add a new asset pipeline or component adapter.

## Release plan

1. **Alpha** — foundation slice works in the kitchen-sink.
2. **Beta** — all asset pipelines and component adapters.
3. **RC** — auto-discovery, docs, and test coverage.
4. **Stable** — merge into `next` and ship as official.

## Checklist

### Workflow

- [ ] Write documentation before the corresponding code is implemented.
- [ ] Keep docs in sync with every API change.
- [ ] Run `cd code && yarn docs:check` after adding or editing docs pages.

### Implementation

- [ ] Write `code/frameworks/symfony-vite/README.md` with quick start, install, config, and troubleshooting.
- [ ] Write `code/renderers/symfony/README.md` with renderer API and advanced usage.
- [ ] Write `storybook-symfony-bundle/README.md` with Composer install, Symfony config, and endpoints.
- [ ] Write `docs/get-started/frameworks/symfony-vite.mdx` matching Storybook docs style.
- [ ] Add installation snippet for `npx storybook add @storybook/symfony-vite`.
- [ ] Add `.storybook/main.ts` configuration example.
- [ ] Add `.stories.ts` example with args and controls.
- [ ] Add auto-discovery example with feature flag.
- [ ] Add Stimulus example with `data-controller`.
- [ ] Add Live Component example with `live: true`.
- [ ] Write migration guide for iframe-based Symfony/Storybook integrations.
- [ ] Document how to remove custom iframe patches.
- [ ] Document how to migrate `.stories.json` to `.stories.ts`.
- [ ] Document how to configure the `storybook` Symfony environment.
- [ ] Add framework to `docs/get-started/frameworks/index.mdx` or equivalent framework list.
- [ ] Add package metadata: keywords, homepage, bugs, repository, funding to all three packages.
- [ ] Plan alpha release date and scope.
- [ ] Plan beta release date and scope.
- [ ] Plan RC release date and scope.
- [ ] Prepare RFC for the Storybook core team with architecture overview.
- [ ] Announce alpha in Storybook Discord `#showcase` channel.
