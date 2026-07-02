import { global } from '@storybook/global';
import type { Plugin } from 'vite';

import { logger } from 'storybook/internal/node-logger';

import { getOrStartServer, stopServer } from './server/manager.ts';
import type { ServerState } from './server/types.ts';
import type { SymfonyFrameworkOptions } from './types.ts';

type ComponentMetadata = {
  id: string;
  type: 'twig_component' | 'live_component';
  title: string;
  template: string;
  class: string;
  props: { name: string; type?: string; required?: boolean; default?: unknown }[];
};

export function symfonyPlugin(options: SymfonyFrameworkOptions): Plugin {
  let serverPromise: Promise<ServerState> | null = null;

  return {
    name: 'storybook-symfony',
    async config() {
      serverPromise = getOrStartServer(options.symfony);
      const server = await serverPromise;

      return {
        define: {
          'import.meta.env.STORYBOOK_SYMFONY_URL': JSON.stringify(server.url),
        },
      };
    },
    configureServer(viteServer) {
      viteServer.httpServer?.on('close', async () => {
        await stopServer();
      });
    },
    async closeBundle() {
      await stopServer();
    },
    resolveId(id) {
      if (isVirtualComponentImport(id)) {
        return id;
      }

      return null;
    },
    async load(id) {
      const componentId = parseComponentIdFromVirtualImport(id);

      if (!componentId || !serverPromise) {
        return null;
      }

      const server = await serverPromise;
      const metadata = await fetchComponentMetadata(server.url, componentId);

      if (!metadata) {
        return null;
      }

      return generateCsfModule(metadata);
    },
  };
}

async function fetchComponentMetadata(
  serverUrl: string,
  componentId: string
): Promise<ComponentMetadata | null> {
  try {
    const response = await global.fetch(`${serverUrl}/_storybook/index`);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { components?: ComponentMetadata[] };

    return data.components?.find((component) => component.id === componentId) ?? null;
  } catch (error) {
    logger.warn(`Failed to fetch metadata for component ${componentId}: ${String(error)}`);

    return null;
  }
}

const VIRTUAL_PREFIX = 'virtual:storybook-symfony-component/';

function isVirtualComponentImport(importPath: string): boolean {
  return importPath.startsWith(VIRTUAL_PREFIX);
}

function parseComponentIdFromVirtualImport(importPath: string): string | undefined {
  if (!isVirtualComponentImport(importPath)) {
    return undefined;
  }

  return importPath.slice(VIRTUAL_PREFIX.length);
}

function generateCsfModule(component: ComponentMetadata): string {
  const adapter = component.type === 'live_component' ? "adapter: 'live',\n" : '';

  return `export default {
  title: ${JSON.stringify(component.title)},
  component: ${JSON.stringify(component.id)},
  parameters: {
    symfony: {
      autoDiscovered: true,
${adapter}    },
  },
};

export const Default = {
  args: ${buildDefaultArgs(component.props)},
};
`;
}

function buildDefaultArgs(
  props: { name: string; type?: string; required?: boolean; default?: unknown }[]
): string {
  const defaults: Record<string, unknown> = {};

  for (const prop of props) {
    if (!prop.required && prop.default !== undefined) {
      defaults[prop.name] = prop.default;
    }
  }

  if (Object.keys(defaults).length === 0) {
    return '{}';
  }

  return JSON.stringify(defaults, null, 2);
}
