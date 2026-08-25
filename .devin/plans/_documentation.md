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
  - `composer require phloom/storybook-symfony-bundle`
  - `yarn add -D @storybook/symfony-vite`
  - the accepted `storybook init` flow once Symfony detection is added
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

Release phases and stability criteria are proposed through the RFC. Dates should be set with the
Storybook champion and maintainers after the RFC is accepted, not invented in the implementation.

## Checklist

### Workflow

- [x] Write documentation before the corresponding code is implemented.
- [x] Keep docs in sync with every API change.
- [x] Run `cd code && yarn docs:check` after adding or editing docs pages.

### Implementation

- [x] Write `code/frameworks/symfony-vite/README.md` with quick start, install, config, and troubleshooting.
- [x] Write `code/renderers/symfony/README.md` with renderer API and advanced usage.
- [x] Write `storybook-symfony-bundle/README.md` with Composer install, Symfony config, and endpoints.
- [x] Write `docs/get-started/frameworks/symfony-vite.mdx` matching Storybook docs style.
- [x] Document Symfony detection through `storybook init` and the explicit companion Composer step.
- [x] Add `.storybook/main.ts` configuration example.
- [x] Add `.stories.ts` example with args and controls.
- [x] Add auto-discovery example with feature flag.
- [x] Add Stimulus example with `data-controller`.
- [x] Add Live Component example with `live: true`.
- [x] Write migration guide for iframe-based Symfony/Storybook integrations.
- [x] Document how to remove custom iframe patches.
- [x] Document how to migrate `.stories.json` to `.stories.ts`.
- [x] Document how to configure the `storybook` Symfony environment.
- [x] Add the canonical page under `docs/get-started/frameworks/`; the index renders the shared
      `HomeRenderers` catalog rather than a repository-local list.
- [x] Classify Symfony as a core framework in the repository-local feature support matrix.
- [ ] Add Symfony to the external `HomeRenderers` supported-framework catalog.
- [x] Document the standard `storybook build` / `storybook-static` contract, source visibility,
      compatibility limits, nested paths, and static hosting requirements.
- [x] Add package metadata: keywords, homepage, bugs, repository, funding to all three packages.
- [ ] Agree preview and stable release criteria with the RFC champion.
- [x] Prepare an RFC draft using Storybook's current GitHub discussion template.
- [ ] Announce alpha in Storybook Discord `#showcase` channel.
