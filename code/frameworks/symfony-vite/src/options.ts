import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { logger } from 'storybook/internal/node-logger';

import { SymfonyFrameworkError } from './errors.ts';
import type { SymfonyFrameworkOptions } from './types.ts';

export type ServerType = NonNullable<NonNullable<SymfonyFrameworkOptions['symfony']>['server']>;

export type ResolvedSymfonyOptions = {
  environment: string;
  projectDir: string;
  publicDir: string;
  /** 'auto' means the backend will be detected at runtime. */
  server: ServerType | 'auto';
  serverUrl?: string;
  port: number;
  phpBinary: string;
  console: string;
  prewarmCache: boolean;
  publicAssetPaths: string[];
  staticInclude?: string[];
  staticExclude?: string[];
};

const DEFAULT_ENVIRONMENT = 'storybook';
const DEFAULT_PHP_BINARY = 'php';
const DEFAULT_CONSOLE = 'bin/console';
const DEFAULT_PUBLIC_ASSET_PATHS = ['/assets', '/build', '/bundles'];

export function resolveSymfonyOptions(
  options: SymfonyFrameworkOptions['symfony'] = {}
): ResolvedSymfonyOptions {
  const projectDir = resolve(options.projectDir ?? process.cwd());
  const publicDir = options.publicDir ? resolve(options.publicDir) : join(projectDir, 'public');
  const environment = options.environment ?? DEFAULT_ENVIRONMENT;
  const phpBinary = options.phpBinary ?? DEFAULT_PHP_BINARY;
  const console = options.console ? resolve(options.console) : join(projectDir, DEFAULT_CONSOLE);
  const server = options.server ?? 'auto';
  const port = options.port ?? 0;

  if (!existsSync(projectDir)) {
    throw new SymfonyFrameworkError(`Symfony project directory does not exist: ${projectDir}`);
  }

  if (server !== 'existing' && !existsSync(publicDir)) {
    logger.warn(`Symfony public directory does not exist: ${publicDir}`);
  }

  if (server === 'existing' && !options.serverUrl) {
    throw new SymfonyFrameworkError(
      `framework.options.symfony.serverUrl is required when server is 'existing'.`
    );
  }

  return {
    environment,
    projectDir,
    publicDir,
    server,
    serverUrl: options.serverUrl,
    port,
    phpBinary,
    console,
    prewarmCache: options.prewarmCache ?? true,
    publicAssetPaths: options.publicAssetPaths ?? DEFAULT_PUBLIC_ASSET_PATHS,
    staticInclude: options.staticInclude,
    staticExclude: options.staticExclude,
  };
}

export function getServerUrl(options: ResolvedSymfonyOptions): string {
  if (options.server === 'existing') {
    return options.serverUrl!;
  }
  return `http://127.0.0.1:${options.port}`;
}
