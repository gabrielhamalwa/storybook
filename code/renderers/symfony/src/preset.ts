import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import type {
  ComponentTitle,
  Indexer,
  Options,
  PresetProperty,
  StoryName,
  Tag,
} from 'storybook/internal/types';

import { createIndexInputsForComponentFile } from './indexer.ts';

type FileContent = {
  title: ComponentTitle;
  tags?: Tag[];
  stories: { name: StoryName; tags?: Tag[] }[];
};

const COMPONENT_FILE_PATTERN = /src\/Twig\/Components\/.*\.php$/;

export const experimental_indexers: PresetProperty<'experimental_indexers'> = async (
  existingIndexers,
  options
) => {
  const features = (await options.presets.apply('features', {}, options)) as Record<
    string,
    unknown
  >;
  const autoDiscoveryEnabled = features?.experimental_symfonyAutoDiscovery === true;
  const indexers: Indexer[] = [
    {
      test: /(stories|story)\.json$/,
      createIndex: async (fileName) => {
        const content: FileContent = JSON.parse(await readFile(fileName, { encoding: 'utf8' }));

        return content.stories.map((story) => {
          const tags = Array.from(new Set([...(content.tags ?? []), ...(story.tags ?? [])]));
          return {
            importPath: fileName,
            exportName: story.name,
            name: story.name,
            title: content.title,
            tags,
            type: 'story',
          };
        });
      },
    },
  ];

  if (autoDiscoveryEnabled) {
    const serverUrl = await resolveSymfonyServerUrl(options);

    if (serverUrl) {
      indexers.push({
        test: COMPONENT_FILE_PATTERN,
        createIndex: async (fileName) => createIndexInputsForComponentFile({ fileName, serverUrl }),
      });
    }
  }

  return [...indexers, ...(existingIndexers || [])];
};

async function resolveSymfonyServerUrl(options: Options): Promise<string | undefined> {
  if (process.env.STORYBOOK_SYMFONY_URL) {
    return process.env.STORYBOOK_SYMFONY_URL;
  }

  try {
    const framework = (await options.presets.apply('framework', {}, options)) as
      | string
      | { options?: { symfony?: { serverUrl?: string } } };
    const frameworkOptions =
      typeof framework === 'string' ? {} : (framework.options?.symfony ?? {});

    if (frameworkOptions.serverUrl) {
      return frameworkOptions.serverUrl;
    }
  } catch {
    // Framework options may not be available; fall through.
  }

  return undefined;
}

export const previewAnnotations: PresetProperty<'previewAnnotations'> = async (
  input = [],
  options
) => {
  const docsEnabled = Object.keys(await options.presets.apply('docs', {}, options)).length > 0;
  const result: string[] = [];

  return result
    .concat(input)
    .concat([fileURLToPath(import.meta.resolve('@storybook/symfony/entry-preview'))])
    .concat(
      docsEnabled
        ? [fileURLToPath(import.meta.resolve('@storybook/symfony/entry-preview-docs'))]
        : []
    );
};
