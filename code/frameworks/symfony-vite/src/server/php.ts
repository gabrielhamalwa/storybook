import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { logger } from 'storybook/internal/node-logger';

import { waitForHealth } from './health.ts';
import { getFreePort } from './port.ts';
import type { ServerState, StartServerOptions } from './types.ts';

export interface PhpServerOptions extends StartServerOptions {
  /** Preferred port. If 0, a random free port is chosen. */
  port: number;
}

export async function startPhpServer(options: PhpServerOptions): Promise<ServerState> {
  const port = options.port === 0 ? await getFreePort() : options.port;
  const frontController = join(options.publicDir, 'index.php');
  const routerDir = await mkdtemp(join(tmpdir(), 'storybook-symfony-'));
  const router = join(routerDir, 'router.php');
  await writeFile(
    router,
    `<?php
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$publicDir = realpath($_SERVER['DOCUMENT_ROOT']);
$file = realpath($_SERVER['DOCUMENT_ROOT'].$path);

if ('/' !== $path && false !== $file && is_file($file) && str_starts_with($file, $publicDir.DIRECTORY_SEPARATOR)) {
    return false;
}

$frontController = getenv('STORYBOOK_SYMFONY_FRONT_CONTROLLER');
if (false === $frontController || !is_file($frontController)) {
    throw new RuntimeException('STORYBOOK_SYMFONY_FRONT_CONTROLLER must point to a readable front controller.');
}

require $frontController;
`
  );

  logger.info(
    `Starting Symfony PHP server at http://127.0.0.1:${port} in ${options.environment} environment`
  );

  const child = spawn(
    options.phpBinary,
    ['-S', `127.0.0.1:${port}`, '-t', options.publicDir, router],
    {
      cwd: options.projectDir,
      env: {
        ...process.env,
        APP_ENV: options.environment,
        STORYBOOK_SYMFONY_FRONT_CONTROLLER: frontController,
      },
      stdio: process.env.DEBUG === 'storybook' ? 'inherit' : 'ignore',
    }
  );

  const url = `http://127.0.0.1:${port}`;

  child.on('error', (error) => {
    logger.error(`Failed to start Symfony PHP server: ${error.message}`);
  });

  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      logger.error(`Symfony PHP server exited with code ${code}`);
    }
  });

  try {
    await waitForHealth(url);
  } catch (error) {
    child.kill('SIGTERM');
    await rm(routerDir, { recursive: true, force: true });
    throw error;
  }

  return {
    url,
    stop: async () => {
      logger.info(`Stopping Symfony PHP server at ${url}`);
      await new Promise<void>((resolve) => {
        child.on('close', resolve);
        setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 5000).unref();
        child.kill('SIGTERM');
      });
      await rm(routerDir, { recursive: true, force: true });
    },
  };
}
