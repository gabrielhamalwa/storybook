import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectServerType } from './detect.ts';

vi.mock('node:child_process', { spy: true });

describe('detectServerType', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(spawnSync).mockReset();
  });

  it('picks frankenphp when it is in PATH', async () => {
    vi.mocked(spawnSync).mockImplementation((command, args) => {
      const binary = Array.isArray(args) ? args[0] : '';
      const isMatch = command === 'command -v' && binary === 'frankenphp';
      return { status: isMatch ? 0 : 1 } as ReturnType<typeof spawnSync>;
    });

    await expect(detectServerType()).resolves.toBe('frankenphp');
  });

  it('picks roadrunner when rr is in PATH and frankenphp is not', async () => {
    vi.mocked(spawnSync).mockImplementation((command, args) => {
      const binary = Array.isArray(args) ? args[0] : '';
      const isMatch = command === 'command -v' && binary === 'rr';
      return { status: isMatch ? 0 : 1 } as ReturnType<typeof spawnSync>;
    });

    await expect(detectServerType()).resolves.toBe('roadrunner');
  });

  it('picks symfony-cli when symfony is in PATH and no faster backend is found', async () => {
    vi.mocked(spawnSync).mockImplementation((command, args) => {
      const binary = Array.isArray(args) ? args[0] : '';
      const isMatch = command === 'command -v' && binary === 'symfony';
      return { status: isMatch ? 0 : 1 } as ReturnType<typeof spawnSync>;
    });

    await expect(detectServerType()).resolves.toBe('symfony-cli');
  });

  it('falls back to php when no backend is detected', async () => {
    vi.mocked(spawnSync).mockReturnValue({ status: 1 } as ReturnType<typeof spawnSync>);

    await expect(detectServerType()).resolves.toBe('php');
  });

  it('uses where on Windows', async () => {
    vi.stubGlobal('process', { ...process, platform: 'win32' });
    vi.mocked(spawnSync).mockReturnValue({ status: 1 } as ReturnType<typeof spawnSync>);

    await expect(detectServerType()).resolves.toBe('php');

    expect(spawnSync).toHaveBeenCalledWith('where', ['frankenphp'], expect.any(Object));
  });
});
