import type { Plugin } from 'vite';

import { logger } from 'storybook/internal/node-logger';

import {
  fetchComponentIndex,
  generateCsfModule,
  isVirtualComponentImport,
  parseComponentIdFromVirtualImport,
} from '@storybook/symfony/indexer';
import { resolveSymfonyOptions } from './options.ts';
import { getOrStartServer, stopServer } from './server/manager.ts';
import {
  collectPublicAssets,
  createStaticRuntimeArtifact,
  type PublicAsset,
  type StaticRuntimeArtifact,
} from './static/package.ts';
import type { SymfonyFrameworkOptions } from './types.ts';

const SYMFONY_PROXY_PATH = '/__storybook_symfony';

export function symfonyPlugin(options: SymfonyFrameworkOptions): Plugin {
  let serverUrl: string | null = null;
  let staticArtifact: StaticRuntimeArtifact | null = null;
  let staticPublicAssets: PublicAsset[] = [];

  return {
    name: 'storybook-symfony',
    async config(_config, environment) {
      const server = await getOrStartServer(options.symfony);
      serverUrl = server.url;
      const resolvedOptions = resolveSymfonyOptions(options.symfony);

      if (environment.command === 'serve') {
        const assetProxies = Object.fromEntries(
          resolvedOptions.publicAssetPaths.map((path) => [
            path,
            { target: server.url, changeOrigin: true },
          ])
        );

        return {
          define: {
            'import.meta.env.STORYBOOK_SYMFONY_URL': JSON.stringify(SYMFONY_PROXY_PATH),
          },
          server: {
            proxy: {
              ...assetProxies,
              [SYMFONY_PROXY_PATH]: {
                target: server.url,
                changeOrigin: true,
                rewrite: (path) => path.slice(SYMFONY_PROXY_PATH.length) || '/',
              },
              // Live Components derives this endpoint from Symfony's route rather than the
              // render response, so it also needs a same-origin path in the preview iframe.
              '/_components': {
                target: server.url,
                changeOrigin: true,
              },
            },
          },
        };
      }

      [staticArtifact, staticPublicAssets] = await Promise.all([
        createStaticRuntimeArtifact(resolvedOptions),
        collectPublicAssets(resolvedOptions),
      ]);

      logger.info(
        `Packaged ${staticArtifact.fileCount} Symfony application files for the static PHP runtime`
      );

      return {
        assetsInclude: [/\.data$/, /\.la$/, /\.so$/, /\.wasm$/],
        define: {
          'import.meta.env.STORYBOOK_SYMFONY_URL': JSON.stringify(''),
          'import.meta.env.STORYBOOK_SYMFONY_ARCHIVE_URL': JSON.stringify(
            `./${staticArtifact.fileName}`
          ),
        },
        worker: {
          format: 'es',
        },
      };
    },
    buildStart() {
      if (!staticArtifact) {
        return;
      }

      this.emitFile({
        type: 'asset',
        fileName: staticArtifact.fileName,
        source: staticArtifact.archive,
      });

      for (const asset of staticPublicAssets) {
        this.emitFile({ type: 'asset', fileName: asset.fileName, source: asset.source });
      }
    },
    resolveId(id) {
      if (isVirtualComponentImport(id)) {
        return id;
      }
    },
    async load(id) {
      if (!isVirtualComponentImport(id)) {
        return;
      }

      const componentId = parseComponentIdFromVirtualImport(id);
      if (!componentId || !serverUrl) {
        return;
      }

      const components = await fetchComponentIndex(serverUrl);
      const component = components.find((c) => c.id === componentId);

      if (!component) {
        logger.warn(`Auto-discovery: component "${componentId}" not found in Symfony index`);
        return;
      }

      return generateCsfModule(component);
    },
    configureServer(viteServer) {
      viteServer.httpServer?.once('close', () => stopServer());
    },
    async closeBundle() {
      await stopServer();
    },
  };
}
