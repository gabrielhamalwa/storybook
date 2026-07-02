import { logger } from 'storybook/internal/node-logger';

import { SymfonyFrameworkError } from '../errors.ts';

export interface WaitForHealthOptions {
  /** Total timeout in milliseconds. Default: 30000. */
  timeout?: number;
  /** Polling interval in milliseconds. Default: 500. */
  interval?: number;
  /** Health endpoint path. Default: /_storybook/health. */
  path?: string;
}

export async function waitForHealth(
  baseUrl: string,
  options: WaitForHealthOptions = {}
): Promise<void> {
  const { timeout = 30000, interval = 500, path = '/_storybook/health' } = options;
  const url = new URL(path, baseUrl).toString();
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        return;
      }
    } catch (error) {
      logger.verbose(
        `Symfony health check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new SymfonyFrameworkError(
    `Symfony server did not become healthy within ${timeout}ms: ${url}`
  );
}
