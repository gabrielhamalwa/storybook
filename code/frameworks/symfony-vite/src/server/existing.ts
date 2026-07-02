import { logger } from 'storybook/internal/node-logger';

import { waitForHealth } from './health.ts';
import type { ServerState } from './types.ts';

export interface ExistingServerOptions {
  serverUrl: string;
}

export async function startExistingServer(options: ExistingServerOptions): Promise<ServerState> {
  const url = options.serverUrl.replace(/\/$/, '');

  logger.info(`Using existing Symfony server at ${url}`);

  await waitForHealth(url);

  return {
    url,
    stop: async () => {
      logger.info(`Leaving existing Symfony server running at ${url}`);
    },
  };
}
