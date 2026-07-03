import { existsSync } from 'node:fs';

import { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveSymfonyOptions } from '../options.ts';

vi.mock('node:fs', { spy: true });
vi.mock('./detect.ts', () => ({
  detectServerType: vi.fn(),
}));

vi.mock('./php.ts', () => ({
  startPhpServer: vi.fn(),
}));

vi.mock('./frankenphp.ts', () => ({
  startFrankenPhpServer: vi.fn(),
}));

vi.mock('./roadrunner.ts', () => ({
  startRoadRunnerServer: vi.fn(),
}));

vi.mock('./symfony-cli.ts', () => ({
  startSymfonyCliServer: vi.fn(),
}));

vi.mock('./existing.ts', () => ({
  startExistingServer: vi.fn(),
}));

vi.mock('./prewarm.ts', () => ({
  prewarmSymfonyCache: vi.fn(),
}));

describe('getOrStartServer', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response));
    vol.reset();
    vol.fromNestedJSON({ '/project/public/index.php': '' });

    const memfs = await vi.importActual<typeof import('memfs')>('memfs');
    vi.mocked(existsSync).mockImplementation(memfs.fs.existsSync as typeof existsSync);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    delete process.env.STORYBOOK_SYMFONY_URL;
  });

  it('auto-detects FrankenPHP and delegates to it', async () => {
    const { detectServerType } = await import('./detect.ts');
    const { startFrankenPhpServer } = await import('./frankenphp.ts');
    const { getOrStartServer } = await import('./manager.ts');

    vi.mocked(detectServerType).mockResolvedValue('frankenphp');
    vi.mocked(startFrankenPhpServer).mockResolvedValue({
      url: 'http://127.0.0.1:8080',
      stop: vi.fn(),
    });

    const state = await getOrStartServer({ projectDir: '/project', server: 'auto' });

    expect(detectServerType).toHaveBeenCalled();
    expect(startFrankenPhpServer).toHaveBeenCalled();
    expect(state.url).toBe('http://127.0.0.1:8080');
    expect(process.env.STORYBOOK_SYMFONY_URL).toBe('http://127.0.0.1:8080');
  });

  it('uses an existing server without spawning a backend', async () => {
    const { startExistingServer } = await import('./existing.ts');
    const { getOrStartServer } = await import('./manager.ts');

    vi.mocked(startExistingServer).mockResolvedValue({
      url: 'http://localhost:8000',
      stop: vi.fn(),
    });

    const state = await getOrStartServer({
      projectDir: '/project',
      server: 'existing',
      serverUrl: 'http://localhost:8000',
    });

    expect(startExistingServer).toHaveBeenCalledWith({ serverUrl: 'http://localhost:8000' });
    expect(state.url).toBe('http://localhost:8000');
  });
});
