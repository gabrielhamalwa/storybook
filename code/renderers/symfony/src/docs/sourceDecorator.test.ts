/** @vitest-environment happy-dom */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emitTransformCode, useEffect, useRef } from 'storybook/preview-api';

import { sourceDecorator } from './sourceDecorator.ts';

vi.mock('storybook/preview-api', () => ({
  emitTransformCode: vi.fn(),
  useEffect: vi.fn((fn) => fn()),
  useRef: vi.fn(),
}));

const createContext = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'button--primary',
    viewMode: 'docs',
    parameters: {
      symfony: { serverUrl: 'http://localhost:8000' },
    },
    args: {},
    unmappedArgs: {},
    ...overrides,
  }) as any;

describe('sourceDecorator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRef).mockReturnValue({ current: undefined });
  });

  it('fetches source and attaches it to parameters.docs.source', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          template: '<button class="btn">{{ label }}</button>',
          class: 'App\\\\Twig\\\\Components\\\\Button',
        }),
      } as unknown as Response)
    );

    const context = createContext();
    sourceDecorator(() => ({}), context);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/_storybook/source/button--primary'
    );
    expect(context.parameters.docs.source).toMatchObject({
      template: '<button class="btn">{{ label }}</button>',
      class: 'App\\\\Twig\\\\Components\\\\Button',
      code: '<button class="btn">{{ label }}</button>',
      language: 'twig',
    });
    expect(emitTransformCode).toHaveBeenCalledWith(
      '<button class="btn">{{ label }}</button>',
      context
    );

    vi.unstubAllGlobals();
  });

  it('uses import.meta.env.STORYBOOK_SYMFONY_URL as fallback', async () => {
    import.meta.env.STORYBOOK_SYMFONY_URL = 'http://localhost:9000';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          template: '<div />',
          class: 'App\\\\Twig\\\\Components\\\\Alert',
        }),
      } as unknown as Response)
    );

    const context = createContext({ parameters: { symfony: {} } });
    sourceDecorator(() => ({}), context);

    await Promise.resolve();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:9000/_storybook/source/button--primary'
    );

    delete import.meta.env.STORYBOOK_SYMFONY_URL;
    vi.unstubAllGlobals();
  });

  it('does not fetch source when not in docs mode', async () => {
    const mockedFetch = vi.fn();
    vi.stubGlobal('fetch', mockedFetch);

    const context = createContext({ viewMode: 'story' });
    sourceDecorator(() => ({}), context);

    await Promise.resolve();

    expect(mockedFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('does not emit source when the endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      } as unknown as Response)
    );

    const context = createContext();
    sourceDecorator(() => ({}), context);

    await Promise.resolve();

    expect(emitTransformCode).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('re-emits cached source on subsequent renders', async () => {
    const template = '<span />';
    vi.mocked(useRef).mockReturnValue({
      current: { template, class: 'App\\\\Twig\\\\Components\\\\Icon' },
    });
    const mockedFetch = vi.fn();
    vi.stubGlobal('fetch', mockedFetch);

    const context = createContext();
    sourceDecorator(() => ({}), context);

    await Promise.resolve();

    expect(mockedFetch).not.toHaveBeenCalled();
    expect(emitTransformCode).toHaveBeenCalledWith(template, context);
    vi.unstubAllGlobals();
  });
});
