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

function runSymfonyCommand(args, { ignoreErrors = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(phpBinary, [consolePath, ...args], {
      cwd: projectDir,
      env: { ...process.env, APP_ENV: environment },
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      if (!ignoreErrors) {
        logger.warn(`Symfony command "${args.join(' ')}" failed: ${error.message}`);
      }
      resolve(0);
    });

    child.on('exit', (code) => {
      if (code !== null && code !== 0 && !ignoreErrors) {
        logger.warn(`Symfony command "${args.join(' ')}" exited with code ${code}.`);
      }
      resolve(code ?? 0);
    });
  });
}

async function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn(phpBinary, [consolePath, 'list', '--format=json'], {
      cwd: projectDir,
      env: { ...process.env, APP_ENV: environment },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    child.on('error', () => {
      resolve(false);
    });

    child.on('exit', (code) => {
      if (code !== null && code !== 0) {
        resolve(false);
        return;
      }
      try {
        const list = JSON.parse(output);
        const commands = Array.isArray(list?.commands) ? list.commands : [];
        resolve(commands.some((entry) => entry?.name === command));
      } catch {
        resolve(false);
      }
    });
  });
}

async function main() {
  await runSymfonyCommand(['cache:warmup', `--env=${environment}`]);

  if (await commandExists('asset-map:compile')) {
    await runSymfonyCommand(['asset-map:compile', `--env=${environment}`], { ignoreErrors: true });
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
