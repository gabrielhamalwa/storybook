import { spawnSync } from 'node:child_process';

import { logger } from 'storybook/internal/node-logger';

import type { ServerType } from '../options.ts';

export async function detectServerType(): Promise<ServerType> {
  if (isInPath('frankenphp')) {
    logger.info('Detected FrankenPHP in PATH; using it as the Symfony server backend');
    return 'frankenphp';
  }

  if (isInPath('rr')) {
    logger.info('Detected RoadRunner in PATH; using it as the Symfony server backend');
    return 'roadrunner';
  }

  if (isInPath('symfony')) {
    logger.info('Detected Symfony CLI in PATH; using it as the Symfony server backend');
    return 'symfony-cli';
  }

  logger.info('No fast Symfony server backend detected; falling back to php -S');
  return 'php';
}

function isInPath(binary: string): boolean {
  const command = process.platform === 'win32' ? 'where' : 'command -v';
  const result = spawnSync(command, [binary], { shell: true, stdio: 'ignore' });
  return result.status === 0;
}
