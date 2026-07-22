declare var STORYBOOK_ENV: 'SYMFONY';

declare interface ImportMetaEnv {
  STORYBOOK_SYMFONY_ARCHIVE_URL?: string;
  STORYBOOK_SYMFONY_URL?: string;
}

declare module '@php-wasm/web-8-4' {
  import { type loadPHPRuntime } from '@php-wasm/universal';

  export function getIntlExtensionPath(): Promise<string>;
  export function getPHPLoaderModule(): Promise<Parameters<typeof loadPHPRuntime>[0]>;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
