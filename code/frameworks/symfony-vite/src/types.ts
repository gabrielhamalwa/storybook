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
    /** PHP server type. Default: 'php'. */
    server?: 'php' | 'frankenphp' | 'roadrunner' | 'symfony-cli' | 'existing';
    /** URL to use when server is 'existing'. */
    serverUrl?: string;
    /** Port for the PHP server. Default: random free port. */
    port?: number;
    /** Path to the PHP binary. Default: 'php'. */
    phpBinary?: string;
    /** Path to the Symfony console. Default: '<projectDir>/bin/console'. */
    console?: string;
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
