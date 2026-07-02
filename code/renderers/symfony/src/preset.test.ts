import { describe, expect, it, vi } from 'vitest';

import type { Indexer, IndexerOptions, IndexInput } from 'storybook/internal/types';

import { experimental_indexers } from './preset.ts';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

const { readFile } = await import('node:fs/promises');

const runIndexers = async (existing: Indexer[] = []): Promise<Indexer[]> => {
  const options: IndexerOptions = { makeTitle: (title) => title ?? 'Untitled' };
  const indexers = await (
    experimental_indexers as unknown as (
      existing: Indexer[],
      options: IndexerOptions
    ) => Promise<Indexer[]>
  )(existing, options);

  return indexers;
};

describe('experimental_indexers', () => {
  it('indexes .stories.json files', async () => {
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        title: 'Button',
        tags: ['autodocs'],
        stories: [{ name: 'Primary', tags: ['primary'] }, { name: 'Secondary' }],
      })
    );

    const indexers = await runIndexers([]);
    const indexer = indexers.find((entry) => entry.test.test('Button.stories.json'));

    expect(indexer).toBeDefined();
    const entries = await indexer!.createIndex('Button.stories.json', {
      makeTitle: (title: string | undefined) => title ?? 'Untitled',
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      importPath: 'Button.stories.json',
      exportName: 'Primary',
      name: 'Primary',
      title: 'Button',
      type: 'story',
    });
    expect(entries[0].tags).toEqual(['autodocs', 'primary']);
    expect(entries[1].tags).toEqual(['autodocs']);
  });

  it('preserves existing indexers', async () => {
    const existing: Indexer[] = [
      { test: /\.stories\.ts$/, createIndex: async () => [] as IndexInput[] },
    ];
    const indexers = await runIndexers(existing);

    expect(indexers).toHaveLength(2);
    expect(indexers[1]).toBe(existing[0]);
  });
});
