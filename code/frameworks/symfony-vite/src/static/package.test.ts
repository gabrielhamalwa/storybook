import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';

import { vol } from 'memfs';
import { unzipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolvedSymfonyOptions } from '../options.ts';
import {
  collectPublicAssets,
  createStaticRuntimeArtifact,
  shouldExcludeStaticPath,
} from './package.ts';

vi.mock('node:fs/promises', { spy: true });

beforeEach(async () => {
  const memfs = await vi.importActual<typeof import('memfs')>('memfs');
  const promises = memfs.fs.promises;

  vi.mocked(lstat).mockImplementation(promises.lstat as typeof lstat);
  vi.mocked(readFile).mockImplementation(promises.readFile as typeof readFile);
  vi.mocked(readdir).mockImplementation(promises.readdir as typeof readdir);
  vi.mocked(realpath).mockImplementation(promises.realpath as typeof realpath);
  vi.mocked(stat).mockImplementation(promises.stat as typeof stat);
});

afterEach(() => {
  vol.reset();
});

describe('createStaticRuntimeArtifact', () => {
  it('packages a bootable application without secrets or cache files', async () => {
    vol.fromNestedJSON({
      '/project/composer.json': JSON.stringify({ require: { 'ext-iconv': '*' } }),
      '/project/composer.lock': JSON.stringify({ packages: [] }),
      '/project/.env.local': 'APP_SECRET=secret',
      '/project/config/services.yaml': 'services: {}',
      '/project/config/secrets/storybook/key': 'secret',
      '/project/src/Component/Button.php': '<?php',
      '/project/templates/components/Button.html.twig': '<button>Button</button>',
      '/project/var/cache/storybook/container.php': '<?php',
      '/project/vendor/autoload_runtime.php': '<?php',
      '/project/public/index.php': '<?php',
      '/project/public/build/app.js': 'export {}',
    });

    const artifact = await createStaticRuntimeArtifact(createOptions());
    const files = unzipSync(artifact.archive);

    expect(Object.keys(files)).toContain('vendor/autoload_runtime.php');
    expect(Object.keys(files)).toContain('public/build/app.js');
    expect(new TextDecoder().decode(files['.env'])).toContain('APP_ENV=storybook');
    expect(Object.keys(files)).not.toContain('.env.local');
    expect(Object.keys(files)).not.toContain('config/secrets/storybook/key');
    expect(Object.keys(files)).not.toContain('var/cache/storybook/container.php');
    expect(artifact.fileName).toMatch(/^symfony-runtime\/application-[a-f0-9]{12}\.zip$/);
  });

  it('rejects Composer extensions unavailable in PHP-WASM', async () => {
    vol.fromNestedJSON({
      '/project/composer.json': JSON.stringify({ require: { 'ext-redis': '*' } }),
      '/project/composer.lock': JSON.stringify({ packages: [] }),
      '/project/vendor/autoload_runtime.php': '<?php',
      '/project/public/index.php': '<?php',
    });

    await expect(createStaticRuntimeArtifact(createOptions())).rejects.toThrow(
      'does not provide required Composer extensions: ext-redis'
    );
  });

  it('rejects static includes that traverse outside the project', async () => {
    vol.fromNestedJSON({
      '/outside/secret.txt': 'secret',
      '/project/vendor/autoload_runtime.php': '<?php',
      '/project/public/index.php': '<?php',
    });

    await expect(
      createStaticRuntimeArtifact({
        ...createOptions(),
        staticInclude: ['config/../../outside/secret.txt'],
      })
    ).rejects.toThrow('staticInclude entries must stay inside the Symfony project');
  });
});

describe('collectPublicAssets', () => {
  it('rejects development-server asset manifests', async () => {
    vol.fromNestedJSON({
      '/project/public/build/entrypoints.json': JSON.stringify({
        viteServer: 'http://localhost:5173',
      }),
    });

    await expect(collectPublicAssets(createOptions())).rejects.toThrow(
      'points to a development server'
    );
  });

  it('rejects manifests that point to an all-interfaces development server', async () => {
    vol.fromNestedJSON({
      '/project/public/build/manifest.json': JSON.stringify({
        viteServer: 'http://0.0.0.0:5173/assets/app.js',
      }),
    });

    await expect(collectPublicAssets(createOptions())).rejects.toThrow(
      'points to a development server'
    );
  });
});

describe('shouldExcludeStaticPath', () => {
  it('always excludes environment files, secrets, tests, logs, and repository metadata', () => {
    for (const path of [
      '.env.prod',
      '.git/config',
      'config/secrets/prod/key',
      'src/tests/Fixture.php',
      'var/log/prod.log',
    ]) {
      expect(shouldExcludeStaticPath(path, [])).toBe(true);
    }
  });

  it('rejects custom excludes that traverse outside the project', () => {
    expect(() => shouldExcludeStaticPath('src/Button.php', ['config/../../outside'])).toThrow(
      'staticExclude entries must stay inside the Symfony project'
    );
  });
});

function createOptions(): ResolvedSymfonyOptions {
  return {
    environment: 'storybook',
    projectDir: '/project',
    publicDir: '/project/public',
    server: 'php',
    port: 0,
    phpBinary: 'php',
    console: '/project/bin/console',
    prewarmCache: true,
    publicAssetPaths: ['/build'],
  };
}
