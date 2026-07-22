import { logger } from 'storybook/internal/node-logger';

import { SymfonyFrameworkError } from '../errors.ts';
import { getServerUrl, resolveSymfonyOptions, type ResolvedSymfonyOptions } from '../options.ts';
import type { SymfonyFrameworkOptions } from '../types.ts';
import { detectServerType } from './detect.ts';
import { startExistingServer } from './existing.ts';
import { startFrankenPhpServer } from './frankenphp.ts';
import { startPhpServer } from './php.ts';
import { prewarmSymfonyCache } from './prewarm.ts';
import { startRoadRunnerServer } from './roadrunner.ts';
import { startSymfonyCliServer } from './symfony-cli.ts';
import type { ServerState } from './types.ts';

let serverPromise: Promise<ServerState> | undefined;

export async function startServer(options: ResolvedSymfonyOptions): Promise<ServerState> {
  const serverType = options.server === 'auto' ? await detectServerType() : options.server;

  if (serverType === 'existing') {
    return startExistingServer({ serverUrl: getServerUrl(options) });
  }

  const startOptions = {
    environment: options.environment,
    projectDir: options.projectDir,
    publicDir: options.publicDir,
    port: options.port,
    phpBinary: options.phpBinary,
    console: options.console,
  };

  switch (serverType) {
    case 'php':
      return startPhpServer(startOptions);
    case 'frankenphp':
      return startFrankenPhpServer(startOptions);
    case 'roadrunner':
      return startRoadRunnerServer(startOptions);
    case 'symfony-cli':
      return startSymfonyCliServer(startOptions);
    default:
      throw new SymfonyFrameworkError(`Unsupported Symfony server backend: ${serverType}`);
  }
}

export function getOrStartServer(
  options: SymfonyFrameworkOptions['symfony'] = {}
): Promise<ServerState> {
  if (serverPromise) {
    return serverPromise;
  }

  const pendingServer = (async () => {
    const resolved = resolveSymfonyOptions(options);
    await prewarmSymfonyCache(resolved);
    const server = await startServer(resolved);

    logger.info(`Symfony server ready at ${server.url}`);
    process.env.STORYBOOK_SYMFONY_URL = server.url;

    return server;
  })();

  serverPromise = pendingServer;
  void pendingServer.catch(() => {
    if (serverPromise === pendingServer) {
      serverPromise = undefined;
      delete process.env.STORYBOOK_SYMFONY_URL;
    }
  });

  return pendingServer;
}

export async function stopServer(): Promise<void> {
  const pendingServer = serverPromise;
  serverPromise = undefined;

  if (!pendingServer) {
    return;
  }

  try {
    const server = await pendingServer;
    await server.stop();
  } finally {
    delete process.env.STORYBOOK_SYMFONY_URL;
  }
}
