import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('sw-ready', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (import.meta.env as Record<string, unknown>).STORYBOOK_MODE;
  });

  it('resolves immediately when STORYBOOK_MODE is undefined', async () => {
    delete (import.meta.env as Record<string, unknown>).STORYBOOK_MODE;
    const { waitForServiceWorker } = await import('./sw-ready.ts');
    await expect(waitForServiceWorker()).resolves.toBeUndefined();
  });

  it('resolves immediately in non-wasm mode', async () => {
    (import.meta.env as Record<string, unknown>).STORYBOOK_MODE = 'dev';
    const { waitForServiceWorker } = await import('./sw-ready.ts');
    await expect(waitForServiceWorker()).resolves.toBeUndefined();
  });

  it('rejects when SW is not supported in wasm mode', async () => {
    (import.meta.env as Record<string, unknown>).STORYBOOK_MODE = 'wasm';
    const { waitForServiceWorker } = await import('./sw-ready.ts');

    await expect(waitForServiceWorker()).rejects.toThrow(
      'Service Worker is not supported in this browser, but buildMode is "wasm"'
    );
  });

  it('isServiceWorkerMode returns true only for wasm mode', async () => {
    (import.meta.env as Record<string, unknown>).STORYBOOK_MODE = 'wasm';
    const { isServiceWorkerMode } = await import('./sw-ready.ts');
    expect(isServiceWorkerMode()).toBe(true);

    (import.meta.env as Record<string, unknown>).STORYBOOK_MODE = 'dev';
    const { isServiceWorkerMode: isSwMode2 } = await import('./sw-ready.ts');
    expect(isSwMode2()).toBe(false);
  });
});
