#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { logger } from 'storybook/internal/node-logger';

const projectDir = process.env.INIT_CWD ?? process.cwd();
const phpBinary = process.env.STORYBOOK_PHP_BINARY ?? 'php';
const environment = process.env.STORYBOOK_SYMFONY_ENV ?? 'storybook';
const consolePath = process.env.STORYBOOK_SYMFONY_CONSOLE ?? resolve(projectDir, 'bin/console');

if (!existsSync(consolePath)) {
  logger.warn(
    `Symfony console not found at ${consolePath}. ` +
      'Skipping post-install cache pre-warm. Run `php bin/console cache:warmup --env=storybook` manually.'
  );
  process.exit(0);
}

const child = spawn(phpBinary, [consolePath, 'cache:warmup', `--env=${environment}`], {
  cwd: projectDir,
  env: { ...process.env, APP_ENV: environment },
  stdio: 'inherit',
});

child.on('error', (error) => {
  logger.warn(`Symfony cache pre-warm failed: ${error.message}`);
  process.exit(0);
});

child.on('exit', (code) => {
  if (code !== null && code !== 0) {
    logger.warn(`Symfony cache pre-warm exited with code ${code}.`);
  }
  process.exit(0);
});
