import { SourceType } from 'storybook/internal/docs-tools';

import { emitTransformCode, useEffect, useRef } from 'storybook/preview-api';

import type { Decorator } from '../public-types.ts';
import type { SymfonyParameters } from '../types.ts';

export function generateTwigSource(
  component: string,
  args: Record<string, unknown>,
  parameters: SymfonyParameters = {}
): string {
  const adapter = parameters.live ? 'live' : parameters.adapter;
  const props = toTwigValue(args);

  if (adapter === 'template' || component.endsWith('.twig')) {
    const template = parameters.template ?? component;
    return `{% include ${JSON.stringify(template)} with ${props} %}`;
  }

  if (adapter === 'controller' || component.includes('::')) {
    const controller = parameters.controller ?? component;
    return `{{ render(controller(${JSON.stringify(controller)}, ${props})) }}`;
  }

  return `{{ component(${JSON.stringify(component)}, ${props}) }}`;
}

export const sourceDecorator: Decorator = (storyFn, context) => {
  const story = storyFn();
  const previousSource = useRef<string | undefined>(undefined);
  const sourceParameters = context.parameters.docs?.source;
  const shouldGenerate =
    context.viewMode === 'docs' &&
    context.parameters.__isArgsStory !== false &&
    !sourceParameters?.code &&
    sourceParameters?.type !== SourceType.CODE &&
    typeof context.component === 'string';

  useEffect(() => {
    if (!shouldGenerate || typeof context.component !== 'string') {
      return;
    }

    const source = generateTwigSource(context.component, context.args, context.parameters.symfony);

    if (source !== previousSource.current) {
      emitTransformCode(source, context);
      previousSource.current = source;
    }
  });

  return story;
};

function toTwigValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(toTwigValue).join(', ')}]`;
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value).map(
      ([key, nestedValue]) => `${JSON.stringify(key)}: ${toTwigValue(nestedValue)}`
    );
    return `{ ${entries.join(', ')} }`;
  }

  return JSON.stringify(`<${typeof value}>`);
}
