import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import type { ComponentTitle, PresetProperty, StoryName, Tag } from 'storybook/internal/types';

type FileContent = {
  title: ComponentTitle;
  tags?: Tag[];
  stories: { name: StoryName; tags?: Tag[] }[];
};

export const experimental_indexers: PresetProperty<'experimental_indexers'> = (
  existingIndexers
) => [
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
  ...(existingIndexers || []),
];

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
