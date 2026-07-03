import { spawn } from 'node:child_process';
import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { logger } from 'storybook/internal/node-logger';

import { waitForHealth } from './health.ts';
import { getFreePort } from './port.ts';
import type { ServerState, StartServerOptions } from './types.ts';

const CONFIG_FILE = '.rr.storybook.yaml';

export async function startRoadRunnerServer(options: StartServerOptions): Promise<ServerState> {
  const port = options.port === 0 ? await getFreePort() : options.port;
  const url = `http://127.0.0.1:${port}`;
  const configPath = join(options.projectDir, CONFIG_FILE);

  logger.info(`Starting RoadRunner server at ${url} in ${options.environment} environment`);

  const config = buildRoadRunnerConfig(options, port);
  await writeFile(configPath, config, 'utf8');

  const child = spawn('rr', ['serve', configPath], {
    cwd: options.projectDir,
    env: {
      ...process.env,
      APP_ENV: options.environment,
    },
    stdio: process.env.DEBUG === 'storybook' ? 'inherit' : 'ignore',
  });

  child.on('error', (error) => {
    logger.error(`Failed to start RoadRunner server: ${error.message}`);
  });

  child.on('exit', (code) => {
    if (code !== null && code !== 0) {
      logger.error(`RoadRunner server exited with code ${code}`);
    }
  });

  await waitForHealth(url);

  return {
    url,
    stop: async () => {
      logger.info(`Stopping RoadRunner server at ${url}`);
      await new Promise<void>((resolve) => {
        child.on('close', resolve);
        setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 5000).unref();
        child.kill('SIGTERM');
      });
      try {
        await unlink(configPath);
      } catch {
        // Config file may already be gone; ignore.
      }
    },
  };
}

function buildRoadRunnerConfig(options: StartServerOptions, port: number): string {
  return `version: "3"

server:
  command: '${options.phpBinary} public/index.php'
  env:
    - APP_ENV: ${options.environment}
    - APP_RUNTIME: 'Runtime\\RoadRunnerSymfonyNyholm\\Runtime'

http:
  address: 127.0.0.1:${port}
`;
}
