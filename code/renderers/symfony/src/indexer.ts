import { readFile } from 'node:fs/promises';

import { logger } from 'storybook/internal/node-logger';
import type { ComponentTitle, IndexInput, StoryName, Tag } from 'storybook/internal/types';

export interface ComponentProp {
  name: string;
  type?: string;
  required?: boolean;
  default?: unknown;
}

export interface ComponentMetadata {
  id: string;
  type: 'twig_component' | 'live_component';
  title: ComponentTitle;
  template: string;
  class: string;
  props: ComponentProp[];
}

export interface IndexResponse {
  components?: ComponentMetadata[];
}

const VIRTUAL_PREFIX = 'virtual:storybook-symfony-component/';

export function createVirtualImportPath(componentId: string): string {
  return `${VIRTUAL_PREFIX}${componentId}`;
}

export function isVirtualComponentImport(importPath: string): boolean {
  return importPath.startsWith(VIRTUAL_PREFIX);
}

export function parseComponentIdFromVirtualImport(importPath: string): string | undefined {
  if (!isVirtualComponentImport(importPath)) {
    return undefined;
  }

  return importPath.slice(VIRTUAL_PREFIX.length);
}

export function generateCsfModule(component: ComponentMetadata): string {
  const adapter = component.type === 'live_component' ? "adapter: 'live',\n" : '';
  const propsJson = JSON.stringify(component.props, null, 2).replace(/`/g, '\\`');

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

function buildDefaultArgs(props: ComponentProp[]): string {
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

export interface AutoDiscoveryOptions {
  serverUrl?: string;
  retries?: number;
  retryDelayMs?: number;
}

export async function fetchComponentIndex(
  serverUrl: string,
  options: AutoDiscoveryOptions = {}
): Promise<ComponentMetadata[]> {
  const { retries = 20, retryDelayMs = 500 } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await global.fetch(`${serverUrl}/_storybook/index`);

      if (!response.ok) {
        throw new Error(`Symfony index endpoint returned ${response.status}`);
      }

      const data = (await response.json()) as IndexResponse;

      return data.components ?? [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  logger.warn(
    `Unable to auto-discover Symfony components: ${lastError?.message ?? 'unknown error'}`
  );

  return [];
}

export interface CreateIndexInputsOptions {
  fileName: string;
  serverUrl: string;
  tags?: Tag[];
}

export async function createIndexInputsForComponentFile(
  options: CreateIndexInputsOptions
): Promise<IndexInput[]> {
  const components = await fetchComponentIndex(options.serverUrl);

  if (components.length === 0) {
    return [];
  }

  const componentId = await extractComponentIdFromFile(options.fileName);
  const matched = componentId
    ? components.find((component) => component.id === componentId)
    : undefined;

  if (!matched) {
    return [];
  }

  return [
    {
      type: 'story',
      exportName: 'Default',
      name: 'Default' as StoryName,
      title: matched.title,
      importPath: createVirtualImportPath(matched.id),
      tags: options.tags,
    },
  ];
}

async function extractComponentIdFromFile(fileName: string): Promise<string | undefined> {
  try {
    const content = await readFile(fileName, { encoding: 'utf8' });
    const match = /#\[AsTwigComponent\(['"]([^'"]+)['"]\)\]/s.exec(content);

    return match?.[1];
  } catch {
    return undefined;
  }
}
