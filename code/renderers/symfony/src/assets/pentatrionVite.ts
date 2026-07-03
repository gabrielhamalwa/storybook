import type { NormalizedAssets, ScriptAsset } from './types.ts';

export interface PentatrionViteAssets {
  devServerUrl: string;
  entrypoints?: string[];
}

export function normalizePentatrionViteAssets({
  devServerUrl,
  entrypoints = ['src/app.ts'],
}: PentatrionViteAssets): NormalizedAssets {
  const scripts: ScriptAsset[] = entrypoints.map((entrypoint) => ({
    url: `${devServerUrl}/build/${entrypoint}`,
    type: 'module',
  }));

  return {
    pipeline: 'pentatrion-vite',
    styles: [],
    scripts,
    importmap: undefined,
  };
}
