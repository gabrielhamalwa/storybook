import { SourceType } from 'storybook/internal/docs-tools';

import { sourceDecorator } from './docs/sourceDecorator.ts';
import type { Parameters } from './types.ts';

export const decorators = [sourceDecorator];

export const parameters: Parameters = {
  renderer: 'symfony',
  docs: {
    source: {
      type: SourceType.DYNAMIC,
      language: 'twig',
    },
  },
};
