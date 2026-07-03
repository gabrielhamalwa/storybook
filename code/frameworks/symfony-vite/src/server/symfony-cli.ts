import { spawn } from 'node:child_process';

import { logger } from 'storybook/internal/node-logger';

import { waitForHealth } from './health.ts';
import { getFreePort } from './port.ts';
import type { ServerState, StartServerOptions } from './types.ts';

export async function startSymfonyCliServer(options: StartServerOptions): Promise<ServerState> {
  const port = options.port === 0 ? await getFreePort() : options.port;
  const url = `http://127.0.0.1:${port}`;

  logger.info(`Starting Symfony CLI server at ${url} in ${options.environment} environment`);

  const child = spawn('symfony', ['server:start', `--port=${port}`, '--no-tls'], {
    cwd: options.projectDir,
    env: {
      ...process.env,
      APP_ENV: options.environment,
    },
    stdio: process.env.DEBUG === 'storybook' ? 'inherit' : 'ignore',
  });

  child.on('error', (error) => {
    logger.error(`Failed to start Symfony CLI server: ${error.message}`);
  });

  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      logger.error(`Symfony CLI server exited with code ${code}`);
    }
  });

  await waitForHealth(url);

  return {
    url,
    stop: async () => {
      logger.info(`Stopping Symfony CLI server at ${url}`);
      await new Promise<void>((resolve) => {
        child.on('close', resolve);
        setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 5000).unref();
        child.kill('SIGTERM');
      });
    },
  };
}
