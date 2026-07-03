import type { NormalizedAssets } from './types.ts';

export function normalizeNoAssets(): NormalizedAssets {
  return {
    pipeline: 'none',
    styles: [],
    scripts: [],
    importmap: undefined,
  };
}
