import { spawn } from 'node:child_process';

import { logger } from 'storybook/internal/node-logger';

import type { ResolvedSymfonyOptions } from '../options.ts';

export async function prewarmSymfonyCache(options: ResolvedSymfonyOptions): Promise<void> {
  if (!options.prewarmCache) {
    return;
  }

  if (options.server === 'existing') {
    return;
  }

  logger.info(
    `Pre-warming Symfony container cache for ${options.environment} environment using ${options.console}`
  );

  await runConsoleCommand(options, ['cache:warmup', `--env=${options.environment}`]);
}

async function runConsoleCommand(options: ResolvedSymfonyOptions, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(options.phpBinary, [options.console, ...args], {
      cwd: options.projectDir,
      env: {
        ...process.env,
        APP_ENV: options.environment,
      },
      stdio: process.env.DEBUG === 'storybook' ? 'inherit' : 'ignore',
    });

    child.on('error', (error) => {
      reject(new Error(`Symfony console command failed: ${error.message}`));
    });

    child.on('exit', (code) => {
      if (code !== null && code !== 0) {
        logger.warn(
          `Symfony cache pre-warm command exited with code ${code}. ` +
            `The server will still start, but the first request may be slower.`
        );
      }
      resolve();
    });
  });
}
