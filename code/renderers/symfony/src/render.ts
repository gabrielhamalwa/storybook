import type { ArgsStoryFn, RenderContext, TeardownRenderToCanvas } from 'storybook/internal/types';

import { global } from '@storybook/global';
import { dedent } from 'ts-dedent';

import { injectAssets, manageStimulus, type RenderResponse } from './assets/index.ts';
import type { SymfonyRenderer } from './types.ts';

export const render: ArgsStoryFn<SymfonyRenderer> = (args, context) => {
  return { componentId: context.component };
};

export async function renderToCanvas(
  {
    id,
    title,
    name,
    showMain,
    showError,
    storyFn,
    storyContext: { args, parameters },
  }: RenderContext<SymfonyRenderer>,
  canvasElement: SymfonyRenderer['canvasElement']
): Promise<void | TeardownRenderToCanvas> {
  const { componentId } = storyFn();

  const { symfony: { serverUrl } = {} } = parameters;

  const url = serverUrl || (import.meta.env.STORYBOOK_SYMFONY_URL as string);

  if (!url) {
    showError({
      title: `Unable to render story "${name}" of "${title}".`,
      description: dedent`
        No Symfony server URL is configured.
        Set parameters.symfony.serverUrl or framework.options.symfony.serverUrl.
      `,
    });
    return;
  }

  if (!componentId) {
    showError({
      title: `Unable to render story "${name}" of "${title}".`,
      description: dedent`
        No Symfony component ID is configured for this story.
        Set the story's "component" property to the Twig component name.
      `,
    });
    return;
  }

  try {
    const response = await global.fetch(`${url}/_storybook/render/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ componentId, args }),
    });

    if (!response.ok) {
      showError({
        title: `Failed to render story "${name}" of "${title}".`,
        description: `Symfony render endpoint returned ${response.status}`,
      });
      return;
    }

    const data = (await response.json()) as RenderResponse;
    const { html, assets } = data;

    const stimulus = manageStimulus();
    stimulus.disconnect();

    showMain();
    canvasElement.innerHTML = html;

    const injected = injectAssets(assets ?? { styles: [], scripts: [] });
    stimulus.connect();

    return () => {
      injected.cleanup();
      stimulus.disconnect();
    };
  } catch (error) {
    showError({
      title: `Failed to render story "${name}" of "${title}".`,
      description: error instanceof Error ? error.message : String(error),
    });
  }
}
