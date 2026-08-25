import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { logger } from 'storybook/internal/node-logger';

import type { ResolvedSymfonyOptions } from '../options.ts';

/**
 * Directories to include in the PHP-WASM zip.
 */
const INCLUDE_DIRS = ['src', 'templates', 'config', 'vendor', 'public/assets', 'var/cache/storybook'];

/**
 * Patterns to exclude from the zip (security-sensitive or unnecessary files).
 */
const EXCLUDE_PATTERNS = [
  /\.env$/,
  /\.env\.local$/,
  /\.env\.prod$/,
  /\/\.git\//,
  /\/node_modules\//,
  /\/var\/log\//,
  /\/var\/tmp\//,
  /\/\.idea\//,
  /\/\.vscode\//,
  /composer\.(json|lock)$/,
  /package\.json$/,
  /yarn\.lock$/,
];

export interface ZipOptions {
  outputPath: string;
}

/**
 * Creates a gzipped tar archive of the Symfony project for PHP-WASM.
 * Only includes directories needed for rendering: src, templates, config, vendor, public/assets, var/cache/storybook.
 */
export async function createSymfonyZip(
  options: ResolvedSymfonyOptions,
  zipOptions: ZipOptions
): Promise<string> {
  const { projectDir } = options;
  const { outputPath } = zipOptions;

  logger.info(`Creating PHP-WASM project archive from ${projectDir}`);

  // @ts-expect-error `tar` is not yet in the workspace types; this file is currently unused.
  const { default: tar } = await import('tar');

  const entries: string[] = [];

  for (const dir of INCLUDE_DIRS) {
    const absDir = join(projectDir, dir);
    try {
      const dirStat = await stat(absDir);
      if (dirStat.isDirectory()) {
        const files = await collectFiles(absDir, projectDir);
        entries.push(...files);
      }
    } catch {
      // Directory doesn't exist, skip it
    }
  }

  logger.info(`Archiving ${entries.length} files from Symfony project`);

  await tar.create(
    {
      gzip: true,
      file: outputPath,
      cwd: projectDir,
    },
    entries
  );

  logger.info(`PHP-WASM archive created at ${outputPath}`);
  return outputPath;
}

async function collectFiles(dirPath: string, projectDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      const relPath = relative(projectDir, fullPath);

      if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(relPath) || pattern.test(fullPath))) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        files.push(relPath);
      }
    }
  }

  await walk(dirPath);
  return files;
}
