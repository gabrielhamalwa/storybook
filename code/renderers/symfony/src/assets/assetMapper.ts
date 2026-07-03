import type { ImportMap, NormalizedAssets, ScriptAsset, StyleAsset } from './types.ts';

export interface AssetMapperAssets {
  importmap?: ImportMap;
  javascripts?: string[];
  stylesheets?: string[];
}

export function normalizeAssetMapperAssets({
  importmap,
  javascripts = [],
  stylesheets = [],
}: AssetMapperAssets): NormalizedAssets {
  const styles: StyleAsset[] = stylesheets.map((url) => ({ url }));
  const scripts: ScriptAsset[] = javascripts.map((url) => ({ url, type: 'module' }));

  return {
    pipeline: 'asset-mapper',
    styles,
    scripts,
    importmap,
  };
}
