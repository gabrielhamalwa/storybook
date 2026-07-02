import type { ArgsStoryFn, RenderContext } from 'storybook/internal/types';

import { global } from '@storybook/global';
import { simulateDOMContentLoaded } from 'storybook/preview-api';
import { dedent } from 'ts-dedent';

import type { SymfonyRenderer } from './types.ts';

const { fetch } = global;

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
) {
  storyFn();

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

  try {
    const response = await fetch(`${url}/_storybook/render/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args }),
    });

    if (!response.ok) {
      showError({
        title: `Failed to render story "${name}" of "${title}".`,
        description: `Symfony render endpoint returned ${response.status}`,
      });
      return;
    }

    const data = await response.json();
    const { html } = data;

    showMain();
    canvasElement.innerHTML = html;
    simulateDOMContentLoaded();
  } catch (error) {
    showError({
      title: `Failed to render story "${name}" of "${title}".`,
      description: error instanceof Error ? error.message : String(error),
    });
  }
}
