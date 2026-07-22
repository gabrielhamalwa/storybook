/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emitTransformCode } from 'storybook/preview-api';

import type { StoryContext } from '../public-types.ts';
import { generateTwigSource, sourceDecorator } from './sourceDecorator.ts';

vi.mock('storybook/preview-api', () => ({
  emitTransformCode: vi.fn(),
  useEffect: (effect: () => void) => effect(),
  useRef: <T>(value: T) => ({ current: value }),
}));

const createContext = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'button--primary',
    component: 'Button',
    viewMode: 'docs',
    parameters: { __isArgsStory: true, symfony: {} },
    args: { label: 'Save', disabled: false },
    ...overrides,
  }) as unknown as StoryContext;

describe('generateTwigSource', () => {
  it('generates a Twig component invocation with nested args', () => {
    expect(
      generateTwigSource('Button', {
        label: 'Save',
        disabled: false,
        options: ['primary', { size: 2 }],
      })
    ).toBe(
      '{{ component("Button", { "label": "Save", "disabled": false, "options": ["primary", { "size": 2 }] }) }}'
    );
  });

  it('generates a template include', () => {
    expect(generateTwigSource('components/Alert.html.twig', { message: 'Saved' })).toBe(
      '{% include "components/Alert.html.twig" with { "message": "Saved" } %}'
    );
  });

  it('generates a controller fragment invocation', () => {
    expect(
      generateTwigSource(
        'Alert',
        { message: 'Saved' },
        {
          adapter: 'controller',
          controller: 'App\\Controller\\AlertController::fragment',
        }
      )
    ).toBe(
      '{{ render(controller("App\\\\Controller\\\\AlertController::fragment", { "message": "Saved" })) }}'
    );
  });
});

describe('sourceDecorator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits dynamic Twig usage in docs mode', () => {
    const context = createContext();

    sourceDecorator(() => ({ componentId: 'Button' }), context);

    expect(emitTransformCode).toHaveBeenCalledWith(
      '{{ component("Button", { "label": "Save", "disabled": false }) }}',
      context
    );
  });

  it('does not override explicitly configured source', () => {
    const context = createContext({
      parameters: { docs: { source: { code: 'custom source' } } },
    });

    sourceDecorator(() => ({ componentId: 'Button' }), context);

    expect(emitTransformCode).not.toHaveBeenCalled();
  });

  it('does not generate source outside docs mode', () => {
    sourceDecorator(() => ({ componentId: 'Button' }), createContext({ viewMode: 'story' }));

    expect(emitTransformCode).not.toHaveBeenCalled();
  });
});
