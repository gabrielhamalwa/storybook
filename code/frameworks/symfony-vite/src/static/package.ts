import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

import { zipSync, type Zippable } from 'fflate';

import { SymfonyFrameworkError } from '../errors.ts';
import type { ResolvedSymfonyOptions } from '../options.ts';

const DEFAULT_APPLICATION_PATHS = [
  'composer.json',
  'composer.lock',
  'config',
  'importmap.php',
  'src',
  'templates',
  'translations',
  'vendor',
];

const ALWAYS_EXCLUDED_SEGMENTS = new Set([
  '.devin',
  '.git',
  '.github',
  '.idea',
  '.storybook',
  '.vscode',
  'coverage',
  'node_modules',
]);

const PHP_WASM_EXTENSIONS = new Set([
  'ctype',
  'curl',
  'date',
  'dom',
  'fileinfo',
  'filter',
  'gd',
  'hash',
  'iconv',
  'intl',
  'json',
  'libxml',
  'mbstring',
  'openssl',
  'pcre',
  'pdo',
  'pdo_sqlite',
  'phar',
  'reflection',
  'session',
  'simplexml',
  'spl',
  'sqlite3',
  'standard',
  'tokenizer',
  'xml',
  'xmlreader',
  'xmlwriter',
  'zip',
  'zlib',
]);

export type StaticRuntimeArtifact = {
  archive: Uint8Array;
  fileName: string;
  fileCount: number;
};

export type PublicAsset = {
  fileName: string;
  source: Uint8Array;
};

export async function createStaticRuntimeArtifact(
  options: ResolvedSymfonyOptions
): Promise<StaticRuntimeArtifact> {
  const files: Zippable = {};
  const seenDirectories = new Set<string>();
  const includes = [...DEFAULT_APPLICATION_PATHS, ...(options.staticInclude ?? [])];

  for (const path of includes) {
    const archivePath = normalizeProjectPath(path, 'staticInclude');
    const sourcePath = resolve(options.projectDir, archivePath);

    try {
      await collectPath({
        archivePath,
        customExcludes: options.staticExclude ?? [],
        files,
        projectDir: options.projectDir,
        seenDirectories,
        sourcePath,
      });
    } catch (error) {
      if (isMissingPathError(error)) {
        continue;
      }
      throw error;
    }
  }

  for (const path of ['index.php', ...options.publicAssetPaths.map(normalizePublicPath)]) {
    try {
      await collectPath({
        archivePath: `public/${path}`,
        customExcludes: options.staticExclude ?? [],
        files,
        projectDir: options.projectDir,
        seenDirectories,
        sourcePath: resolve(options.publicDir, path),
      });
    } catch (error) {
      if (!isMissingPathError(error)) {
        throw error;
      }
    }
  }

  if (!files['vendor/autoload_runtime.php']) {
    throw new SymfonyFrameworkError(
      `Static Symfony builds require installed Composer dependencies. ` +
        `Run composer install in ${options.projectDir} before building Storybook.`
    );
  }

  if (!files['public/index.php']) {
    throw new SymfonyFrameworkError(
      `Static Symfony builds require ${join(options.publicDir, 'index.php')}.`
    );
  }

  validateComposerPlatformRequirements(files);

  files['.env'] = new TextEncoder().encode(
    [
      'APP_ENV=storybook',
      'APP_DEBUG=0',
      'APP_SECRET=storybook-static-runtime',
      'DEFAULT_URI=http://storybook.invalid',
      '',
    ].join('\n')
  );

  const archive = zipSync(files, { level: 6 });
  const digest = createHash('sha256').update(archive).digest('hex').slice(0, 12);

  return {
    archive,
    fileName: `symfony-runtime/application-${digest}.zip`,
    fileCount: Object.keys(files).length,
  };
}

export async function collectPublicAssets(options: ResolvedSymfonyOptions): Promise<PublicAsset[]> {
  const assets: PublicAsset[] = [];

  for (const publicPath of options.publicAssetPaths ?? []) {
    const normalized = normalizePublicPath(publicPath);
    const sourceRoot = resolve(options.publicDir, normalized);

    try {
      await collectPublicPath(sourceRoot, normalized, options.publicDir, assets);
    } catch (error) {
      if (!isMissingPathError(error)) {
        throw error;
      }
    }
  }

  validateProductionAssetManifests(assets);
  return assets;
}

type CollectPathOptions = {
  archivePath: string;
  customExcludes: string[];
  files: Zippable;
  projectDir: string;
  seenDirectories: Set<string>;
  sourcePath: string;
};

async function collectPath(options: CollectPathOptions): Promise<void> {
  const { archivePath, customExcludes, files, projectDir, seenDirectories, sourcePath } = options;

  if (shouldExcludeStaticPath(archivePath, customExcludes)) {
    return;
  }

  const entry = await lstat(sourcePath);
  let resolvedSource = sourcePath;

  if (entry.isSymbolicLink()) {
    resolvedSource = await realpath(sourcePath);
    await assertSafeApplicationSymlink(resolvedSource, projectDir, archivePath);
  }

  const resolvedEntry = entry.isSymbolicLink() ? await stat(resolvedSource) : entry;

  if (resolvedEntry.isDirectory()) {
    const canonicalDirectory = await realpath(resolvedSource);
    if (seenDirectories.has(canonicalDirectory)) {
      return;
    }
    seenDirectories.add(canonicalDirectory);

    const children = await readdir(resolvedSource, { withFileTypes: true });
    await Promise.all(
      children.map((child) =>
        collectPath({
          ...options,
          archivePath: `${archivePath}/${child.name}`,
          sourcePath: join(resolvedSource, child.name),
        })
      )
    );
    return;
  }

  if (resolvedEntry.isFile()) {
    files[archivePath] = new Uint8Array(await readFile(resolvedSource));
  }
}

async function collectPublicPath(
  sourcePath: string,
  publicPath: string,
  publicDir: string,
  assets: PublicAsset[]
): Promise<void> {
  const entry = await lstat(sourcePath);

  if (entry.isSymbolicLink()) {
    const resolvedSource = await realpath(sourcePath);
    assertInsideProject(resolvedSource, publicDir, publicPath);
    return collectPublicPath(resolvedSource, publicPath, publicDir, assets);
  }

  if (entry.isDirectory()) {
    const children = await readdir(sourcePath, { withFileTypes: true });
    await Promise.all(
      children.map((child) =>
        collectPublicPath(
          join(sourcePath, child.name),
          `${publicPath}/${child.name}`,
          publicDir,
          assets
        )
      )
    );
    return;
  }

  if (entry.isFile()) {
    assets.push({ fileName: publicPath, source: new Uint8Array(await readFile(sourcePath)) });
  }
}

export function shouldExcludeStaticPath(path: string, customExcludes: string[]): boolean {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '');
  const segments = normalized.split('/');

  if (segments.some((segment) => ALWAYS_EXCLUDED_SEGMENTS.has(segment))) {
    return true;
  }

  if (segments.some((segment) => segment === 'test' || segment === 'tests')) {
    return true;
  }

  if (
    segments.some((segment) => segment === 'var') &&
    segments.some((segment) => segment === 'cache' || segment === 'log')
  ) {
    return true;
  }

  if (segments.some((segment) => segment === 'secrets') || /(^|\/)\.env(?:\.|$)/.test(normalized)) {
    return true;
  }

  return customExcludes.some((excluded) => {
    const prefix = normalizeProjectPath(excluded, 'staticExclude');
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  });
}

function normalizeProjectPath(path: string, optionName: string): string {
  const normalized = path.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
  const segments = normalized.split('/');

  if (!normalized || isAbsolute(path) || segments.includes('..')) {
    throw new SymfonyFrameworkError(
      `framework.options.symfony.${optionName} entries must stay inside the Symfony project: ${path}`
    );
  }

  return normalized;
}

function normalizePublicPath(path: string): string {
  const normalized = path.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/$/, '');
  const segments = normalized.split('/');

  if (!normalized || segments.includes('..')) {
    throw new SymfonyFrameworkError(`Invalid Symfony public asset path: ${path}`);
  }

  return normalized;
}

function assertInsideProject(resolvedPath: string, root: string, displayPath: string): void {
  const relativePath = relative(root, resolvedPath);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new SymfonyFrameworkError(
      `Static Symfony builds cannot package a symlink outside the project: ${displayPath} -> ${resolvedPath}`
    );
  }
}

async function assertSafeApplicationSymlink(
  resolvedPath: string,
  projectDir: string,
  archivePath: string
): Promise<void> {
  const relativePath = relative(projectDir, resolvedPath);
  if (relativePath !== '..' && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath)) {
    return;
  }

  const composerPackage = archivePath.match(/^vendor\/([^/]+\/[^/]+)$/)?.[1];
  if (composerPackage) {
    try {
      const composer = JSON.parse(await readFile(join(resolvedPath, 'composer.json'), 'utf8')) as {
        name?: string;
      };
      if (composer.name === composerPackage) {
        return;
      }
    } catch {
      // Fall through to the actionable error below.
    }
  }

  throw new SymfonyFrameworkError(
    `Static Symfony builds cannot package a symlink outside the project: ${archivePath} -> ${resolvedPath}`
  );
}

function validateProductionAssetManifests(assets: PublicAsset[]): void {
  const decoder = new TextDecoder();

  for (const asset of assets) {
    if (!/(?:entrypoints|manifest)\.json$/.test(asset.fileName)) {
      continue;
    }

    const contents = decoder.decode(asset.source);
    if (
      /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?(?=[/?#"'\s]|$)/i.test(
        contents
      )
    ) {
      throw new SymfonyFrameworkError(
        `Symfony asset manifest ${asset.fileName} points to a development server. ` +
          `Build your application assets for production before running storybook build.`
      );
    }
  }
}

function validateComposerPlatformRequirements(files: Zippable): void {
  const composer = decodeJsonFile(files, 'composer.json');
  const lock = decodeJsonFile(files, 'composer.lock');
  const packages = [...readObjectArray(lock?.packages), ...readObjectArray(lock?.['packages-dev'])];
  const providedExtensions = new Set<string>();

  for (const packageDefinition of packages) {
    collectExtensionNames(packageDefinition.provide, providedExtensions);
    collectExtensionNames(packageDefinition.replace, providedExtensions);
  }

  const requiredExtensions = new Set<string>();
  collectExtensionNames(composer?.require, requiredExtensions);
  collectExtensionNames(composer?.['require-dev'], requiredExtensions);
  for (const packageDefinition of packages) {
    collectExtensionNames(packageDefinition.require, requiredExtensions);
  }

  const unsupported = [...requiredExtensions]
    .filter(
      (extension) =>
        !PHP_WASM_EXTENSIONS.has(extension.slice('ext-'.length)) &&
        !providedExtensions.has(extension)
    )
    .sort();

  if (unsupported.length > 0) {
    throw new SymfonyFrameworkError(
      `The static PHP-WASM runtime does not provide required Composer extensions: ${unsupported.join(', ')}. ` +
        `Replace those dependencies in the storybook environment or use a supported extension.`
    );
  }
}

type ComposerObject = Record<string, unknown>;

function decodeJsonFile(files: Zippable, path: string): ComposerObject | undefined {
  const value = files[path];
  if (!(value instanceof Uint8Array)) {
    return undefined;
  }

  try {
    return JSON.parse(new TextDecoder().decode(value)) as ComposerObject;
  } catch {
    throw new SymfonyFrameworkError(`Unable to parse ${path} while preparing the static runtime.`);
  }
}

function readObjectArray(value: unknown): ComposerObject[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is ComposerObject => typeof entry === 'object' && entry !== null)
    : [];
}

function collectExtensionNames(value: unknown, target: Set<string>): void {
  if (typeof value !== 'object' || value === null) {
    return;
  }

  for (const name of Object.keys(value)) {
    const normalized = name.toLowerCase();
    if (normalized.startsWith('ext-')) {
      target.add(normalized);
    }
  }
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}
