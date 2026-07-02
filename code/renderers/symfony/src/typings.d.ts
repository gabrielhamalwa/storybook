declare var STORYBOOK_ENV: 'SYMFONY';

declare interface ImportMetaEnv {
  STORYBOOK_SYMFONY_URL?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
