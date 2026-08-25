# Sub-plan: Storybook Framework `@storybook/symfony-vite`

## Goal

Wire the Symfony renderer to the Vite builder and manage the Symfony/PHP dev server lifecycle.

## Working rules

Every implementation decision and code change in this sub-plan must be grounded in the actual documentation and source available in the Storybook monorepo, the Symfony documentation, and Symfony UX documentation. Do not rely on memory or assumptions.

- **Storybook side:** Before writing or editing any Storybook-related code, read the relevant local docs in `docs/` and the existing framework/renderer packages in `code/`. Cross-check `AGENTS.md` for monorepo conventions, build commands, and testing rules.
- **Symfony side:** Before writing or editing any PHP bundle code, fetch the current Symfony documentation and Symfony UX documentation. Symfony APIs, bundle conventions, and Twig component behavior change over time; verify them every time.
- **No guessing:** If a contract, API, or behavior is not verified by the docs or source, treat it as unknown and look it up before building on it.
- **Checklists drive work:** Use the checklist in this sub-plan to track progress. Do not mark an item complete until it is actually implemented and verified.

## Location

`code/frameworks/symfony-vite/` in the Storybook monorepo.

## Required files

Every new framework package in the monorepo needs these files at minimum:

- `README.md` — user-facing quick start and configuration reference.
- `package.json` — name `@storybook/symfony-vite`, exports, dependencies, peer dependencies.
- `project.json` — NX project with `compile` and `check` targets.
- `build-config.ts` — browser entries (`index.ts`) and node entries (`preset.ts`, optional `node/index.ts`).
- `preset.js` — re-export `dist/preset.js` so Storybook can load the preset before compilation.
- `tsconfig.json` — extends `../../tsconfig.json`, includes `src/**/*`.
- `vitest.config.ts` — extends `../../vitest.shared.ts`.
- `src/index.ts` — re-exports `@storybook/symfony` and framework-specific types.
- `src/preset.ts` — exports `core` (builder + renderer) and `viteFinal`.
- `src/types.ts` — `StorybookConfig` and `SymfonyFrameworkOptions`.
- `src/vite-plugin.ts` — Vite plugin that manages the PHP server lifecycle.
- `src/server/` — PHP server start/stop implementations for each backend type.

## Package structure

```text
code/frameworks/symfony-vite/
├── package.json
├── project.json
├── build-config.ts
├── preset.js
├── tsconfig.json
└── src/
    ├── index.ts
    ├── preset.ts
    └── types.ts
```

## Preset

The framework preset is minimal. It declares the renderer and builder:

```ts
import type { PresetProperty } from 'storybook/internal/types';

export const core: PresetProperty<'core'> = {
  builder: import.meta.resolve('@storybook/builder-vite'),
  renderer: import.meta.resolve('@storybook/symfony/preset'),
};
```

The framework also provides `viteFinal` to:

1. Add a Vite plugin that starts the PHP server.
2. Configure Vite proxy rules for `/_storybook/*` routes.
3. Set environment variables for the renderer (e.g., `STORYBOOK_SYMFONY_URL`).

## PHP server management

A Vite plugin in the framework handles the PHP server lifecycle:

```ts
export function symfonyPlugin(options: SymfonyFrameworkOptions): Plugin {
  return {
    name: 'storybook-symfony',
    configureServer(server) {
      const phpServer = startPhpServer(options);
      server.httpServer?.on('close', () => phpServer.stop());
    },
    async config() {
      const url = await waitForPhpServer(options);
      return {
        define: {
          'import.meta.env.STORYBOOK_SYMFONY_URL': JSON.stringify(url),
        },
      };
    },
  };
}
```

The plugin:

1. Resolves the PHP binary or server type.
2. Starts the server in the `storybook` Symfony environment.
3. Waits for the health endpoint `GET /_storybook/health`.
4. Stops the server when Vite shuts down.

## Framework options

```ts
export type SymfonyFrameworkOptions = {
  symfony?: {
    /** Symfony environment name. Default: 'storybook'. */
    environment?: string;
    /** Path to the Symfony project root. Default: current working directory. */
    projectDir?: string;
    /** Path to the public directory. Default: '<projectDir>/public'. */
    publicDir?: string;
    /** PHP server type. Default: 'php'. */
    server?: 'php' | 'frankenphp' | 'roadrunner' | 'symfony-cli' | 'existing';
    /** URL to use when server is 'existing'. */
    serverUrl?: string;
    /** Port for the PHP server. Default: random free port. */
    port?: number;
    /** Path to the PHP binary. Default: 'php'. */
    phpBinary?: string;
    /** Path to the Symfony console. Default: '<projectDir>/bin/console'. */
    console?: string;
  };
  builder?: BuilderOptions;
};
```

## Configuration example

```ts
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/symfony-vite';

const config: StorybookConfig = {
  stories: ['../templates/components/**/*.stories.ts'],
  addons: ['@storybook/addon-essentials'],
  framework: {
    name: '@storybook/symfony-vite',
    options: {
      symfony: {
        environment: 'storybook',
        server: 'php',
      },
    },
  },
};

export default config;
```

## Types

The framework exports `StorybookConfig` that extends the base Vite config and the framework options.

## Checklist

### Workflow

- [x] Write `code/frameworks/symfony-vite/README.md` before implementing the framework.
- [x] Add or update a unit test for every framework feature implemented.
- [x] Run `yarn nx compile symfony-vite` after each framework change.
- [x] Run `yarn nx run-many -t check` before committing framework changes.
- [x] Run `cd code && yarn fmt:write` before committing framework changes.

### Implementation

- [x] Create `code/frameworks/symfony-vite/package.json` with dependencies on `@storybook/symfony`, `@storybook/builder-vite`, and `storybook` peer.
- [x] Create `code/frameworks/symfony-vite/project.json` with `compile` and `check` targets.
- [x] Create `code/frameworks/symfony-vite/build-config.ts`.
- [x] Create `code/frameworks/symfony-vite/tsconfig.json`.
- [x] Create `src/types.ts` exporting `StorybookConfig` and `SymfonyFrameworkOptions`.
- [x] Create `src/index.ts` re-exporting `@storybook/symfony` and `types.ts`.
- [x] Create `src/preset.ts` exporting `core` with builder and renderer.
- [x] Add `viteFinal` export in `src/preset.ts` that injects the Symfony Vite plugin.
- [x] Create `src/vite-plugin.ts` with `storybookSymfonyPlugin` function.
- [x] Implement `configureServer` hook to start the PHP server.
- [x] Implement `closeBundle`/`close` hook to stop the PHP server.
- [x] Implement `php -S` start command and stop logic.
- [x] Implement free port detection for the PHP server.
- [x] Implement health-check polling against `/_storybook/health`.
- [x] Implement `serverUrl` injection via `define` or environment variable.
- [x] Implement FrankenPHP start/stop command.
- [x] Implement RoadRunner start/stop command.
- [x] Implement Symfony CLI start/stop command.
- [x] Implement "existing server" mode that skips start/stop.
- [x] Implement server auto-detection based on binaries in `PATH`.
- [x] Create `src/options.ts` with default framework options.
- [x] Validate options: `projectDir` exists, `publicDir` exists, `bin/console` exists.
- [x] Add `vitest.config.ts` for framework tests.
- [x] Write Vitest test: Vite plugin starts PHP server and waits for health.
- [x] Write Vitest test: Vite plugin stops PHP server on close.
- [x] Write Vitest test: `core` preset resolves builder and renderer.
- [x] Write Vitest test: options validation rejects missing project dir.

### First-class monorepo integration

- [x] Register renderer and framework build entries in `scripts/build/entry-configs.ts`.
- [x] Add the framework and renderer to core enums and renderer/builder mappings.
- [x] Add package exports, Nx compile/check targets, READMEs, and package metadata.
- [x] Add the canonical framework documentation and migration guide.
- [x] Add dedicated monorepo and kitchen-sink CI, including a backend-free static E2E job.
- [x] Add Symfony project detection and a registered generator to `create-storybook`.
- [x] Keep Composer mutations outside the Node initializer; report the required
      `composer require --dev phloom/storybook-symfony-bundle` step explicitly.
- [ ] Add Symfony to the externally supplied supported-framework card catalog used by
      `HomeRenderers`; that catalog is not defined in this repository.
- [x] Audit renderer-conditional documentation and add Symfony only to features whose contracts are
      supported (CSF, controls, play functions, docs, testing, publishing).
- [ ] Add release ownership, package provenance/license approval, and the companion bundle's release
      process before requesting stable status.
