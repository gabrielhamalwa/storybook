import { describe, expect, it, vi } from 'vitest';

import type { Indexer, IndexerOptions, IndexInput, Options } from 'storybook/internal/types';

import { experimental_indexers } from './preset.ts';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

const { readFile } = await import('node:fs/promises');

const createOptions = (features: Record<string, any> = {}): Options => {
  return {
    configDir: '/config',
    presets: {
      apply: vi.fn(async (key: string) => {
        if (key === 'features') {
          return features;
        }
        if (key === 'framework') {
          return {
            name: '@storybook/symfony-vite',
            options: { symfony: { server: 'existing', serverUrl: 'http://localhost:9999' } },
          };
        }
        return {};
      }),
    },
  } as unknown as Options;
};

const runIndexers = async (
  existing: Indexer[] = [],
  options: Options = createOptions()
): Promise<Indexer[]> => {
  const indexerOptions: IndexerOptions = { makeTitle: (title) => title ?? 'Untitled' };
  const indexers = await (
    experimental_indexers as unknown as (
      existing: Indexer[],
      options: Options
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

  it('registers the auto-discovery indexer when the feature flag is enabled', async () => {
    const options = createOptions({ experimental_symfonyAutoDiscovery: true });
    const indexers = await runIndexers([], options);

    const autoDiscoveryIndexer = indexers.find((entry) =>
      entry.test.test('src/Twig/Components/Button.php')
    );
    expect(autoDiscoveryIndexer).toBeDefined();
  });

  it('does not register the auto-discovery indexer when the feature flag is disabled', async () => {
    const options = createOptions({ experimental_symfonyAutoDiscovery: false });
    const indexers = await runIndexers([], options);

    const autoDiscoveryIndexer = indexers.find((entry) =>
      entry.test.test('src/Twig/Components/Button.php')
    );
    expect(autoDiscoveryIndexer).toBeUndefined();
  });

  it('uses STORYBOOK_SYMFONY_URL when available', async () => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubEnv('STORYBOOK_SYMFONY_URL', 'http://localhost:8888');

    const mockedFetch = vi.mocked(global.fetch);
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ components: [] }),
    } as Response);

    const options = createOptions({ experimental_symfonyAutoDiscovery: true });
    const indexers = await runIndexers([], options);
    const autoDiscoveryIndexer = indexers.find((entry) =>
      entry.test.test('src/Twig/Components/Button.php')
    );

    expect(autoDiscoveryIndexer).toBeDefined();
    await autoDiscoveryIndexer!.createIndex('/project/src/Twig/Components/Button.php', {
      makeTitle: (title) => title ?? 'Untitled',
    });

    expect(mockedFetch).toHaveBeenCalledWith('http://localhost:8888/_storybook/index');

    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});
