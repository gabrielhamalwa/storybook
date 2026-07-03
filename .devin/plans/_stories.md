# Sub-plan: Story Format and Indexing

## Goal

Define how users write stories and how Storybook discovers them.

## Working rules

Every implementation decision and code change in this sub-plan must be grounded in the actual documentation and source available in the Storybook monorepo, the Symfony documentation, and Symfony UX documentation. Do not rely on memory or assumptions.

- **Storybook side:** Before writing or editing any Storybook-related code, read the relevant local docs in `docs/` and the existing framework/renderer packages in `code/`. Cross-check `AGENTS.md` for monorepo conventions, build commands, and testing rules.
- **Symfony side:** Before writing or editing any PHP bundle code, fetch the current Symfony documentation and Symfony UX documentation. Symfony APIs, bundle conventions, and Twig component behavior change over time; verify them every time.
- **No guessing:** If a contract, API, or behavior is not verified by the docs or source, treat it as unknown and look it up before building on it.
- **Checklists drive work:** Use the checklist in this sub-plan to track progress. Do not mark an item complete until it is actually implemented and verified.

## Primary format: CSF `.stories.ts`

Users write stories in TypeScript for full control, types, and addon support.

```ts
// templates/components/Button.stories.ts
import type { Meta, StoryObj } from '@storybook/symfony-vite';

const meta = {
  component: 'Button',
  title: 'Components/Button',
  parameters: {
    symfony: {
      // optional overrides
      template: 'templates/components/Button.html.twig',
      adapter: 'twig_component',
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: { label: 'Save', variant: 'primary' },
};

export const Secondary: Story = {
  args: { label: 'Cancel', variant: 'secondary' },
  play: async ({ canvasElement }) => {
    const button = canvasElement.querySelector('button');
    button?.click();
  },
};
```

The `component` field can be:

- A Twig component name: `Button`
- A template path: `templates/components/Button.html.twig`
- A controller reference: `App\Controller\ButtonController::fragment`

## Auto-discovery format: `experimental_indexer`

For users who want zero story files, the framework exposes an experimental indexer that scans the Symfony project.

The indexer is enabled by a feature flag:

```ts
// .storybook/main.ts
export default {
  stories: ['../src/Twig/Components/**/*.php'],
  features: {
    experimental_symfonyAutoDiscovery: true,
  },
};
```

The indexer works by:

1. The Storybook preset registers an `experimental_indexer` that matches component files.
2. For each file, it calls the Composer bundle `GET /_storybook/index` endpoint.
3. The bundle returns metadata and props.
4. The indexer generates `IndexInput` entries with a virtual import path.
5. The virtual import path resolves to a generated story module that re-exports the component metadata.

## Story types

| Story type | Input | Notes |
|---|---|---|
| Twig component | `Button` | Requires `#[AsTwigComponent]` class. |
| Live component | `Button` with `live: true` | Renders initial state; live updates work if Stimulus is initialized. |
| Template | `templates/components/Button.html.twig` | Direct Twig render; no component class required. |
| Controller fragment | `App\Controller\ButtonController::fragment` | Useful for existing controller actions. |

## Args and argTypes

Args are passed to the Symfony render endpoint as JSON. The bundle uses them as Twig template variables or component props.

ArgTypes can be inferred from:

1. `#[AsTwigComponent]` constructor/properties via PHP reflection.
2. Twig `{% props %}` block.
3. User-defined `argTypes` in the story file.

The bundle exposes inferred argTypes via the index endpoint, which the renderer can use to enhance controls.

## Docs and source

For the docs panel, the bundle provides:

- `GET /_storybook/source/{id}` — Twig template source.
- `GET /_storybook/index` — component metadata and props.

The renderer can expose these as parameters so the docs addon displays them.

## Checklist

### Workflow

- [x] Update `docs/get-started/frameworks/symfony-vite.mdx` whenever the story format or indexing changes.
- [x] Add or update type tests for every public type change.
- [x] Add a kitchen-sink story for every story type supported.
- [x] Run `yarn nx run-many -t check` after changes to public types or indexer.

### Implementation

- [x] Define `Meta<TArgs>` type in `src/public-types.ts`.
- [x] Define `StoryObj<TArgs>` type in `src/public-types.ts`.
- [x] Define `StoryFn<TArgs>` type in `src/public-types.ts`.
- [x] Define `Decorator<TArgs>` type in `src/public-types.ts`.
- [x] Define `StoryContext<TArgs>` type in `src/public-types.ts`.
- [x] Implement `component` resolution in `renderToCanvas` (component name, template path, controller reference).
- [x] Implement `parameters.symfony` overrides (adapter, template, environment, server overrides).
- [x] Implement `experimental_indexers` in `src/preset.ts` matching `src/Twig/Components/**/*.php`.
- [x] Implement indexer call to `GET /_storybook/index` to discover components.
- [x] Implement virtual story module generation for auto-discovered components.
- [x] Add `parameters.symfony.autoDiscovered` flag to distinguish generated stories.
- [x] Implement argType inference in bundle from `#[AsTwigComponent]` constructor parameters.
- [x] Implement argType inference in bundle from `#[AsTwigComponent]` public properties.
- [ ] Implement argType inference in bundle from Twig `{% props %}` block.
- [x] Implement `GET /_storybook/source/{id}` endpoint returning Twig template source.
- [x] Implement `GET /_storybook/source/{id}` endpoint returning component class source.
- [ ] Expose source parameters so docs panel can display Twig source.
- [ ] Add Autodocs support for `.stories.ts` files.
- [x] Write `.stories.ts` example: Twig component with args.
- [ ] Write `.stories.ts` example: Live component with args.
- [x] Write `.stories.ts` example: plain Twig template with args.
- [x] Write `.stories.ts` example: controller fragment with args.
- [x] Write auto-discovery example that generates stories from component files.
