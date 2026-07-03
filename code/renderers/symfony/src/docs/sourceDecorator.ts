import { SourceType } from 'storybook/internal/docs-tools';

import { emitTransformCode, useEffect, useRef } from 'storybook/preview-api';

import { global } from '@storybook/global';

import type { Decorator } from '../public-types.ts';

export interface SourceResponse {
  template: string;
  class: string;
}

function resolveServerUrl(context: {
  parameters?: { symfony?: { serverUrl?: string } };
}): string | undefined {
  return (
    context.parameters?.symfony?.serverUrl ||
    (import.meta.env.STORYBOOK_SYMFONY_URL as string) ||
    undefined
  );
}

export const sourceDecorator: Decorator = (storyFn, context) => {
  const story = storyFn();
  const sourceRef = useRef<SourceResponse | undefined>(undefined);

  useEffect(() => {
    if (context.viewMode !== 'docs') {
      return;
    }

    if (sourceRef.current) {
      emitTransformCode(sourceRef.current.template, context);
      return;
    }

    const serverUrl = resolveServerUrl(context);
    if (!serverUrl) {
      return;
    }

    const fetchSource = async () => {
      try {
        const response = await global.fetch(`${serverUrl}/_storybook/source/${context.id}`);
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as SourceResponse;
        sourceRef.current = data;

        const existingDocs = context.parameters.docs ?? {};
        const existingSource = existingDocs.source ?? {};
        context.parameters = {
          ...context.parameters,
          docs: {
            ...existingDocs,
            source: {
              ...existingSource,
              template: data.template,
              class: data.class,
              code: data.template,
              language: 'twig',
              type: SourceType.DYNAMIC,
            },
          },
        };

        emitTransformCode(data.template, context);
      } catch {
        // Source endpoint is optional; failures are ignored.
      }
    };

    fetchSource();
  });

  return story;
};
