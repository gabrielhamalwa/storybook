import { afterEach, describe, expect, it, vi } from 'vitest';

import { waitForHealth } from './health.ts';

describe('waitForHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves when the health endpoint responds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 } as Response));

    await expect(
      waitForHealth('http://localhost:8000', { timeout: 1000, interval: 50 })
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/_storybook/health', {
      method: 'GET',
    });
  });

  it('polls until the endpoint becomes healthy', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('connection refused'))
        .mockResolvedValueOnce({ ok: false, status: 503 } as Response)
        .mockResolvedValue({ ok: true, status: 200 } as Response)
    );

    await expect(
      waitForHealth('http://localhost:8000', { timeout: 1000, interval: 50 })
    ).resolves.toBeUndefined();

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('throws when the timeout is exceeded', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 } as Response));

    await expect(
      waitForHealth('http://localhost:8000', { timeout: 100, interval: 50 })
    ).rejects.toThrow('Symfony server did not become healthy within 100ms');
  });
});
