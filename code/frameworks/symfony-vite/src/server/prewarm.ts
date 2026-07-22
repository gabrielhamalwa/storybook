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
  await runConsoleCommand(options, ['asset-map:compile', `--env=${options.environment}`], true);
}

async function runConsoleCommand(
  options: ResolvedSymfonyOptions,
  args: string[],
  silentFailure = false
): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn(options.phpBinary, [options.console, ...args], {
      cwd: options.projectDir,
      env: {
        ...process.env,
        APP_ENV: options.environment,
      },
      stdio: process.env.DEBUG === 'storybook' ? 'inherit' : 'ignore',
    });

    child.on('error', (error) => {
      if (!silentFailure) {
        logger.warn(
          `Symfony command "${args.join(' ')}" could not start: ${error.message}. ` +
            `The server will still start, but the first request may be slower.`
        );
      }
      resolve();
    });

    child.on('exit', (code) => {
      if (code !== null && code !== 0 && !silentFailure) {
        logger.warn(
          `Symfony command "${args.join(' ')}" exited with code ${code}. ` +
            `The server will still start, but the first request may be slower.`
        );
      }
      resolve();
    });
  });
}
