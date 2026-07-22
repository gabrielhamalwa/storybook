import { spawn, type ChildProcess } from 'node:child_process';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolvedSymfonyOptions } from '../options.ts';
import { prewarmSymfonyCache } from './prewarm.ts';

vi.mock('node:child_process', { spy: true });

type EventHandler = (...args: unknown[]) => void;

const createMockChildProcess = (exitCode = 0): ChildProcess => {
  const eventHandlers: Record<string, EventHandler[]> = {};

  const child = {
    on: vi.fn((event: string, handler: EventHandler) => {
      eventHandlers[event] = eventHandlers[event] ?? [];
      eventHandlers[event].push(handler);
      if (event === 'exit') {
        handler(exitCode, null);
      }
      return child as ChildProcess;
    }),
    once: vi.fn((event: string, handler: EventHandler) => {
      eventHandlers[event] = eventHandlers[event] ?? [];
      eventHandlers[event].push(handler);
      if (event === 'exit') {
        handler(exitCode, null);
      }
      return child as ChildProcess;
    }),
  } as unknown as ChildProcess;

  return child;
};

const baseOptions: ResolvedSymfonyOptions = {
  environment: 'storybook',
  projectDir: '/project',
  publicDir: '/project/public',
  server: 'php',
  port: 8080,
  phpBinary: 'php',
  console: '/project/bin/console',
  prewarmCache: true,
};

describe('prewarmSymfonyCache', () => {
  beforeEach(() => {
    vi.mocked(spawn).mockReturnValue(createMockChildProcess());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('spawns php console cache:warmup with the environment when enabled', async () => {
    await prewarmSymfonyCache(baseOptions);

    expect(spawn).toHaveBeenNthCalledWith(
      1,
      'php',
      ['/project/bin/console', 'cache:warmup', '--env=storybook'],
      {
        cwd: '/project',
        env: expect.objectContaining({ APP_ENV: 'storybook' }),
        stdio: 'ignore',
      }
    );
    expect(spawn).toHaveBeenNthCalledWith(
      2,
      'php',
      ['/project/bin/console', 'asset-map:compile', '--env=storybook'],
      {
        cwd: '/project',
        env: expect.objectContaining({ APP_ENV: 'storybook' }),
        stdio: 'ignore',
      }
    );
  });

  it('skips pre-warming when prewarmCache is false', async () => {
    await prewarmSymfonyCache({ ...baseOptions, prewarmCache: false });

    expect(spawn).not.toHaveBeenCalled();
  });

  it('skips pre-warming for existing server mode', async () => {
    await prewarmSymfonyCache({
      ...baseOptions,
      server: 'existing',
      serverUrl: 'http://localhost:8000',
    });

    expect(spawn).not.toHaveBeenCalled();
  });

  it('continues when cache pre-warming fails', async () => {
    vi.mocked(spawn).mockReturnValueOnce(createMockChildProcess(1));

    await expect(prewarmSymfonyCache(baseOptions)).resolves.toBeUndefined();
    expect(spawn).toHaveBeenCalledTimes(2);
  });
});
