import type {
  CompatibleString,
  StorybookConfig as StorybookConfigBase,
} from 'storybook/internal/types';

import type { BuilderOptions, StorybookConfigVite } from '@storybook/builder-vite';

type FrameworkName = CompatibleString<'@storybook/symfony-vite'>;
type BuilderName = CompatibleString<'@storybook/builder-vite'>;

export type SymfonyFrameworkOptions = {
  symfony?: {
    /** Symfony environment name. Default: 'storybook'. */
    environment?: string;
    /** Path to the Symfony project root. Default: current working directory. */
    projectDir?: string;
    /** Path to the public directory. Default: '<projectDir>/public'. */
    publicDir?: string;
    /** PHP server type. Auto prefers FrankenPHP, then Symfony CLI, then php -S. */
    server?: 'php' | 'frankenphp' | 'roadrunner' | 'symfony-cli' | 'existing' | 'auto';
    /** URL to use when server is 'existing'. Development and build-time indexing only. */
    serverUrl?: string;
    /** Port for the PHP server. Default: random free port. */
    port?: number;
    /** Path to the PHP binary. Default: 'php'. */
    phpBinary?: string;
    /** Path to the Symfony console. Default: '<projectDir>/bin/console'. */
    console?: string;
    /** Pre-warm the Symfony container cache before starting the PHP server. Default: true. */
    prewarmCache?: boolean;
    /** Public URL prefixes proxied during development and copied into static builds. */
    publicAssetPaths?: string[];
    /** Additional project-relative files or directories packaged for static Storybook builds. */
    staticInclude?: string[];
    /** Additional project-relative files or directories excluded from static Storybook builds. */
    staticExclude?: string[];
  };
  builder?: BuilderOptions;
};

type FrameworkOptions = {
  builder?: BuilderOptions;
} & SymfonyFrameworkOptions;

type StorybookConfigFramework = {
  framework:
    | FrameworkName
    | {
        name: FrameworkName;
        options: FrameworkOptions;
      };
  core?: StorybookConfigBase['core'] & {
    builder?:
      | BuilderName
      | {
          name: BuilderName;
          options: BuilderOptions;
        };
  };
};

/** The interface for Storybook configuration in `main.ts` files. */
export type StorybookConfig = Omit<
  StorybookConfigBase,
  keyof StorybookConfigVite | keyof StorybookConfigFramework
> &
  StorybookConfigVite &
  StorybookConfigFramework;
