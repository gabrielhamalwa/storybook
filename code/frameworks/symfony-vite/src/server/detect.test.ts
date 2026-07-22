import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectServerType } from './detect.ts';

vi.mock('node:child_process', { spy: true });

describe('detectServerType', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(spawnSync).mockReset();
  });

  it('prefers FrankenPHP when it is in PATH', async () => {
    vi.mocked(spawnSync).mockImplementation((command, args) => {
      const binary = Array.isArray(args) ? args[3] : '';
      const isMatch = command === '/bin/sh' && binary === 'frankenphp';
      return { status: isMatch ? 0 : 1 } as ReturnType<typeof spawnSync>;
    });

    await expect(detectServerType()).resolves.toBe('frankenphp');
  });

  it('picks the Symfony CLI when FrankenPHP is unavailable', async () => {
    vi.mocked(spawnSync).mockImplementation((command, args) => {
      const binary = Array.isArray(args) ? args[3] : '';
      const isMatch = command === '/bin/sh' && binary === 'symfony';
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

    expect(spawnSync).toHaveBeenCalledWith('where.exe', ['frankenphp'], expect.any(Object));
  });
});
