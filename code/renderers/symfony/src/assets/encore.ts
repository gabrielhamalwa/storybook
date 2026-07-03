import type { NormalizedAssets, ScriptAsset, StyleAsset } from './types.ts';

export interface EncoreEntrypoint {
  name: string;
  css?: string[];
  js?: string[];
}

export function normalizeEncoreAssets(entrypoints: EncoreEntrypoint[]): NormalizedAssets {
  const styles: StyleAsset[] = [];
  const scripts: ScriptAsset[] = [];

  entrypoints.forEach((entrypoint) => {
    entrypoint.css?.forEach((url) => {
      styles.push({ url });
    });
    entrypoint.js?.forEach((url) => {
      scripts.push({ url });
    });
  });

  return {
    pipeline: 'encore',
    styles,
    scripts,
    importmap: undefined,
  };
}
