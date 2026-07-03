import { afterEach, describe, expect, it, vi } from 'vitest';

import { startExistingServer } from './existing.ts';

describe('startExistingServer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the configured server URL and waits for health', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response));

    const server = await startExistingServer({ serverUrl: 'http://localhost:8000' });

    expect(server.url).toBe('http://localhost:8000');
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/_storybook/health', {
      method: 'GET',
    });
  });

  it('trims a trailing slash from the server URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response));

    const server = await startExistingServer({ serverUrl: 'http://localhost:8000/' });

    expect(server.url).toBe('http://localhost:8000');
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/_storybook/health', {
      method: 'GET',
    });
  });

  it('stop() does not kill anything', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response));

    const server = await startExistingServer({ serverUrl: 'http://localhost:8000' });

    await expect(server.stop()).resolves.toBeUndefined();
  });
});
