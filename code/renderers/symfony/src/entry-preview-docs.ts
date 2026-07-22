import { SourceType } from 'storybook/internal/docs-tools';

import { generateTwigSource, sourceDecorator } from './docs/sourceDecorator.ts';
import type { Parameters } from './types.ts';

export const decorators = [sourceDecorator];

export const parameters: Parameters = {
  renderer: 'symfony',
  docs: {
    source: {
      type: SourceType.DYNAMIC,
      language: 'twig',
      transform: (_source, context) =>
        typeof context.component === 'string'
          ? generateTwigSource(context.component, context.args, context.parameters.symfony)
          : '',
    },
  },
};
