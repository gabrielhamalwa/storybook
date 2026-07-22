import type { ArgsStoryFn, RenderContext, TeardownRenderToCanvas } from 'storybook/internal/types';

import { global } from '@storybook/global';
import { dedent } from 'ts-dedent';

import { injectAssets, type RenderResponse } from './assets/index.ts';
import type { SymfonyRenderer } from './types.ts';
import {
  getStaticAssetBaseUrl,
  installLiveComponentFetchBridge,
  requestSymfonyWasm,
} from './wasm/client.ts';

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
    storyContext: { args, globals, parameters },
  }: RenderContext<SymfonyRenderer>,
  canvasElement: SymfonyRenderer['canvasElement']
): Promise<void | TeardownRenderToCanvas> {
  const { componentId } = storyFn();

  const { symfony: { serverUrl, adapter, template, controller, live } = {} } = parameters;

  const url = serverUrl || (import.meta.env.STORYBOOK_SYMFONY_URL as string);
  const archiveUrl = import.meta.env.STORYBOOK_SYMFONY_ARCHIVE_URL as string | undefined;

  if (!url && !archiveUrl) {
    showError({
      title: `Unable to render story "${name}" of "${title}".`,
      description: dedent`
        No Symfony runtime is configured.
        Start Storybook through @storybook/symfony-vite or set parameters.symfony.serverUrl.
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
    const requestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        componentId,
        adapter: live ? 'live' : adapter,
        template,
        controller,
        args,
        globals,
      }),
    } satisfies RequestInit;

    const response = archiveUrl
      ? await requestSymfonyWasm(archiveUrl, `/_storybook/render/${id}`, requestInit)
      : await global.fetch(`${url}/_storybook/render/${id}`, requestInit);

    if (!response.ok) {
      showError({
        title: `Failed to render story "${name}" of "${title}".`,
        description: await getErrorDescription(response),
      });
      return;
    }

    const data = (await response.json()) as RenderResponse;
    const { html, assets } = data;

    if (archiveUrl) {
      installLiveComponentFetchBridge(archiveUrl);
    }

    showMain();
    canvasElement.innerHTML = html;

    const assetBaseUrl = archiveUrl ? getStaticAssetBaseUrl(archiveUrl) : url;
    const injected = injectAssets(
      assets ?? { styles: [], scripts: [] },
      assetBaseUrl,
      Boolean(archiveUrl)
    );

    return () => {
      injected.cleanup();
    };
  } catch (error) {
    showError({
      title: `Failed to render story "${name}" of "${title}".`,
      description: error instanceof Error ? error.message : String(error),
    });
  }
}

async function getErrorDescription(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    const details = payload.message ?? payload.error;
    return details
      ? `Symfony render endpoint returned ${response.status}: ${details}`
      : `Symfony render endpoint returned ${response.status}`;
  } catch {
    return `Symfony render endpoint returned ${response.status}`;
  }
}
