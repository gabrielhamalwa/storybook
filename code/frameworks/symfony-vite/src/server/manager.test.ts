import { existsSync } from 'node:fs';

import { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', { spy: true });
vi.mock('./detect.ts', () => ({ detectServerType: vi.fn() }));
vi.mock('./php.ts', () => ({ startPhpServer: vi.fn() }));
vi.mock('./frankenphp.ts', () => ({ startFrankenPhpServer: vi.fn() }));
vi.mock('./roadrunner.ts', () => ({ startRoadRunnerServer: vi.fn() }));
vi.mock('./symfony-cli.ts', () => ({ startSymfonyCliServer: vi.fn() }));
vi.mock('./existing.ts', () => ({ startExistingServer: vi.fn() }));
vi.mock('./prewarm.ts', () => ({ prewarmSymfonyCache: vi.fn() }));

describe('Symfony server manager', () => {
  beforeEach(async () => {
    vi.resetModules();
    vol.reset();
    vol.fromNestedJSON({ '/project/public/index.php': '' });

    const memfs = await vi.importActual<typeof import('memfs')>('memfs');
    vi.mocked(existsSync).mockImplementation(memfs.fs.existsSync as typeof existsSync);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.STORYBOOK_SYMFONY_URL;
  });

  it('detects and starts a local backend once', async () => {
    const { detectServerType } = await import('./detect.ts');
    const { startSymfonyCliServer } = await import('./symfony-cli.ts');
    const { getOrStartServer } = await import('./manager.ts');

    vi.mocked(detectServerType).mockResolvedValue('symfony-cli');
    vi.mocked(startSymfonyCliServer).mockResolvedValue({
      url: 'http://127.0.0.1:8080',
      stop: vi.fn(),
    });

    const first = getOrStartServer({ projectDir: '/project' });
    const second = getOrStartServer({ projectDir: '/project' });

    await expect(first).resolves.toBe(await second);
    expect(startSymfonyCliServer).toHaveBeenCalledOnce();
    expect(process.env.STORYBOOK_SYMFONY_URL).toBe('http://127.0.0.1:8080');
  });

  it('uses an existing backend without spawning a local process', async () => {
    const { startExistingServer } = await import('./existing.ts');
    const { getOrStartServer } = await import('./manager.ts');

    vi.mocked(startExistingServer).mockResolvedValue({
      url: 'https://storybook-backend.example.com',
      stop: vi.fn(),
    });

    const server = await getOrStartServer({
      projectDir: '/project',
      server: 'existing',
      serverUrl: 'https://storybook-backend.example.com',
    });

    expect(startExistingServer).toHaveBeenCalledWith({
      serverUrl: 'https://storybook-backend.example.com',
    });
    expect(server.url).toBe('https://storybook-backend.example.com');
  });

  it('retries after a server startup failure', async () => {
    const { prewarmSymfonyCache } = await import('./prewarm.ts');
    const { startPhpServer } = await import('./php.ts');
    const { getOrStartServer } = await import('./manager.ts');

    vi.mocked(prewarmSymfonyCache)
      .mockRejectedValueOnce(new Error('warmup failed'))
      .mockResolvedValueOnce(undefined);
    vi.mocked(startPhpServer).mockResolvedValue({
      url: 'http://127.0.0.1:8080',
      stop: vi.fn(),
    });

    await expect(getOrStartServer({ projectDir: '/project', server: 'php' })).rejects.toThrow(
      'warmup failed'
    );
    await expect(
      getOrStartServer({ projectDir: '/project', server: 'php' })
    ).resolves.toMatchObject({
      url: 'http://127.0.0.1:8080',
    });

    expect(prewarmSymfonyCache).toHaveBeenCalledTimes(2);
    expect(startPhpServer).toHaveBeenCalledOnce();
  });

  it('clears the published URL even when stopping fails', async () => {
    const { startPhpServer } = await import('./php.ts');
    const { getOrStartServer, stopServer } = await import('./manager.ts');
    const stop = vi.fn().mockRejectedValue(new Error('stop failed'));

    vi.mocked(startPhpServer).mockResolvedValue({ url: 'http://127.0.0.1:8080', stop });
    await getOrStartServer({ projectDir: '/project', server: 'php' });

    await expect(stopServer()).rejects.toThrow('stop failed');
    expect(process.env.STORYBOOK_SYMFONY_URL).toBeUndefined();
  });
});
