import { spawnSync } from 'node:child_process';

import { logger } from 'storybook/internal/node-logger';

import type { ServerType } from '../options.ts';

export async function detectServerType(): Promise<ServerType> {
  if (isInPath('frankenphp')) {
    logger.info('Detected FrankenPHP; using its classic local server');
    return 'frankenphp';
  }

  if (isInPath('symfony')) {
    logger.info('Detected Symfony CLI; using its local web server');
    return 'symfony-cli';
  }

  logger.info('Symfony CLI and FrankenPHP were not found; falling back to php -S');
  return 'php';
}

function isInPath(binary: string): boolean {
  const result =
    process.platform === 'win32'
      ? spawnSync('where.exe', [binary], { stdio: 'ignore' })
      : spawnSync('/bin/sh', ['-c', 'command -v "$1"', 'storybook-symfony', binary], {
          stdio: 'ignore',
        });
  return result.status === 0;
}
