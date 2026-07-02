import type { Plugin } from 'vite';

import { logger } from 'storybook/internal/node-logger';

import { SymfonyFrameworkError } from './errors.ts';
import { getServerUrl, resolveSymfonyOptions, type ResolvedSymfonyOptions } from './options.ts';
import { detectServerType } from './server/detect.ts';
import { startExistingServer } from './server/existing.ts';
import { startFrankenPhpServer } from './server/frankenphp.ts';
import { startPhpServer } from './server/php.ts';
import { startRoadRunnerServer } from './server/roadrunner.ts';
import { startSymfonyCliServer } from './server/symfony-cli.ts';
import type { ServerState } from './server/types.ts';
import type { SymfonyFrameworkOptions } from './types.ts';

export function symfonyPlugin(options: SymfonyFrameworkOptions): Plugin {
  let serverPromise: Promise<ServerState> | null = null;

  return {
    name: 'storybook-symfony',
    async config() {
      const resolved = resolveSymfonyOptions(options.symfony);
      const serverType = resolved.server === 'auto' ? await detectServerType() : resolved.server;

      serverPromise = startServer(resolved, serverType);
      const server = await serverPromise;

      logger.info(`Symfony server ready at ${server.url}`);

      return {
        define: {
          'import.meta.env.STORYBOOK_SYMFONY_URL': JSON.stringify(server.url),
        },
      };
    },
    configureServer(viteServer) {
      viteServer.httpServer?.on('close', async () => {
        if (serverPromise) {
          const server = await serverPromise;
          await server.stop();
        }
      });
    },
    async closeBundle() {
      if (serverPromise) {
        const server = await serverPromise;
        await server.stop();
      }
    },
  };
}

async function startServer(
  options: ResolvedSymfonyOptions,
  serverType: ResolvedSymfonyOptions['server'] & {}
): Promise<ServerState> {
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
