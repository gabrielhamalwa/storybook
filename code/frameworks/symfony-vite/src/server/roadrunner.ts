import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { logger } from 'storybook/internal/node-logger';

import { waitForHealth } from './health.ts';
import { getFreePort } from './port.ts';
import type { ServerState, StartServerOptions } from './types.ts';

function generateRoadRunnerConfig(options: StartServerOptions, port: number): string {
  const command = `${shellQuote(options.phpBinary)} ${shellQuote(join(options.publicDir, 'index.php'))}`;

  return `version: "3"

server:
  command: ${yamlQuote(command)}
  env:
    APP_ENV: ${yamlQuote(options.environment)}
    APP_RUNTIME: 'Runtime\\RoadRunnerSymfonyNyholm\\Runtime'

http:
  address: 127.0.0.1:${port}
  middleware: [ "static" ]
  static:
    dir: ${yamlQuote(options.publicDir)}
    forbid: [ ".php", ".htaccess" ]
`;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function yamlQuote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export async function startRoadRunnerServer(options: StartServerOptions): Promise<ServerState> {
  const port = options.port === 0 ? await getFreePort() : options.port;
  const url = `http://127.0.0.1:${port}`;
  const configDir = await mkdtemp(join(tmpdir(), 'storybook-symfony-roadrunner-'));
  const configPath = join(configDir, 'rr.yaml');

  logger.info(`Starting RoadRunner server at ${url} in ${options.environment} environment`);

  const configContent = generateRoadRunnerConfig(options, port);
  try {
    await writeFile(configPath, configContent, 'utf8');
  } catch (error) {
    await rm(configDir, { recursive: true, force: true });
    throw error;
  }
  logger.info(`Generated RoadRunner config at ${configPath}`);

  const child = spawn('rr', ['serve', '-c', configPath], {
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

  try {
    await waitForHealth(url);
  } catch (error) {
    child.kill('SIGTERM');
    await rm(configDir, { recursive: true, force: true });
    throw error;
  }

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

      await rm(configDir, { recursive: true, force: true });
      logger.info(`Removed RoadRunner config at ${configPath}`);
    },
  };
}
