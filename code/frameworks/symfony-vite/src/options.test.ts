import { existsSync } from 'node:fs';

import { vol } from 'memfs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getServerUrl, resolveSymfonyOptions } from './options.ts';

vi.mock('node:fs', { spy: true });

beforeEach(async () => {
  const memfs = await vi.importActual<typeof import('memfs')>('memfs');
  vi.mocked(existsSync).mockImplementation(memfs.fs.existsSync as typeof existsSync);
});

afterEach(() => {
  vol.reset();
});

describe('resolveSymfonyOptions', () => {
  it('uses defaults when no options are provided', () => {
    vol.fromNestedJSON({ '/project/public/index.php': '' });

    const options = resolveSymfonyOptions({ projectDir: '/project' });

    expect(options.environment).toBe('storybook');
    expect(options.projectDir).toBe('/project');
    expect(options.publicDir).toBe('/project/public');
    expect(options.server).toBe('auto');
    expect(options.port).toBe(0);
    expect(options.phpBinary).toBe('php');
    expect(options.console).toBe('/project/bin/console');
    expect(options.prewarmCache).toBe(true);
  });

  it('throws when projectDir does not exist', () => {
    expect(() => resolveSymfonyOptions({ projectDir: '/missing' })).toThrow(
      'Symfony project directory does not exist: /missing'
    );
  });

  it('requires serverUrl for existing server mode', () => {
    vol.fromNestedJSON({ '/project/public/index.php': '' });

    expect(() => resolveSymfonyOptions({ projectDir: '/project', server: 'existing' })).toThrow(
      "framework.options.symfony.serverUrl is required when server is 'existing'."
    );
  });

  it('resolves custom paths', () => {
    vol.fromNestedJSON({ '/custom/public/index.php': '' });

    const options = resolveSymfonyOptions({
      projectDir: '/custom',
      publicDir: '/custom/public',
      environment: 'test',
      server: 'php',
      port: 8080,
      phpBinary: '/usr/bin/php',
      console: '/custom/app/console',
    });

    expect(options.environment).toBe('test');
    expect(options.server).toBe('php');
    expect(options.port).toBe(8080);
    expect(options.phpBinary).toBe('/usr/bin/php');
    expect(options.console).toBe('/custom/app/console');
  });
});

describe('getServerUrl', () => {
  it('returns configured serverUrl for existing server mode', () => {
    vol.fromNestedJSON({ '/project/public/index.php': '' });

    const options = resolveSymfonyOptions({
      projectDir: '/project',
      server: 'existing',
      serverUrl: 'http://localhost:8000',
    });

    expect(getServerUrl(options)).toBe('http://localhost:8000');
  });

  it('returns localhost URL for managed server modes', () => {
    vol.fromNestedJSON({ '/project/public/index.php': '' });

    const options = resolveSymfonyOptions({ projectDir: '/project', server: 'php', port: 8080 });

    expect(getServerUrl(options)).toBe('http://127.0.0.1:8080');
  });
});
