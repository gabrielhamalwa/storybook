import { logger } from 'storybook/internal/node-logger';

import { getServerUrl, resolveSymfonyOptions, type ResolvedSymfonyOptions } from '../options.ts';
import type { SymfonyFrameworkOptions } from '../types.ts';
import { detectServerType } from './detect.ts';
import { startExistingServer } from './existing.ts';
import { startFrankenPhpServer } from './frankenphp.ts';
import { startPhpServer } from './php.ts';
import { startRoadRunnerServer } from './roadrunner.ts';
import { startSymfonyCliServer } from './symfony-cli.ts';
import type { ServerState } from './types.ts';

let serverPromise: Promise<ServerState> | null = null;

export function startServer(options: ResolvedSymfonyOptions): Promise<ServerState> {
  const serverType = options.server === 'auto' ? 'php' : options.server;

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
      throw new Error(`Unsupported Symfony server backend: ${serverType}`);
  }
}

export async function getOrStartServer(
  options: SymfonyFrameworkOptions['symfony'] = {}
): Promise<ServerState> {
  if (serverPromise) {
    return serverPromise;
  }

  serverPromise = (async () => {
    const resolved = resolveSymfonyOptions(options);
    const serverType = resolved.server === 'auto' ? await detectServerType() : resolved.server;
    const state = await startServer({ ...resolved, server: serverType });

    logger.info(`Symfony server ready at ${state.url}`);
    process.env.STORYBOOK_SYMFONY_URL = state.url;

    return state;
  })();

  return serverPromise;
}

export async function stopServer(): Promise<void> {
  if (!serverPromise) {
    return;
  }

  const server = await serverPromise;
  await server.stop();
  serverPromise = null;
}
