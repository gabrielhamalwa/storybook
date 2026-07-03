import { describe, expect, it } from 'vitest';

import {
  normalizeAssetMapperAssets,
  normalizeEncoreAssets,
  normalizeNoAssets,
  normalizePentatrionViteAssets,
} from './index.ts';

describe('pipeline asset normalization', () => {
  it('normalizes Pentatrion Vite assets with module scripts', () => {
    const assets = normalizePentatrionViteAssets({
      devServerUrl: 'http://localhost:5173',
      entrypoints: ['src/app.ts', 'src/app2.ts'],
    });

    expect(assets.pipeline).toBe('pentatrion-vite');
    expect(assets.styles).toEqual([]);
    expect(assets.scripts).toEqual([
      { url: 'http://localhost:5173/build/src/app.ts', type: 'module' },
      { url: 'http://localhost:5173/build/src/app2.ts', type: 'module' },
    ]);
    expect(assets.importmap).toBeUndefined();
  });

  it('normalizes Encore entrypoints into styles and scripts', () => {
    const assets = normalizeEncoreAssets([
      { name: 'app', css: ['/build/app.css'], js: ['/build/app.js'] },
      { name: 'vendor', js: ['/build/vendor.js'] },
    ]);

    expect(assets.pipeline).toBe('encore');
    expect(assets.styles).toEqual([{ url: '/build/app.css' }]);
    expect(assets.scripts).toEqual([{ url: '/build/app.js' }, { url: '/build/vendor.js' }]);
  });

  it('normalizes AssetMapper importmap, scripts, and styles', () => {
    const assets = normalizeAssetMapperAssets({
      importmap: { imports: { app: '/assets/app.js' } },
      javascripts: ['/assets/app.js'],
      stylesheets: ['/assets/app.css'],
    });

    expect(assets.pipeline).toBe('asset-mapper');
    expect(assets.importmap).toEqual({ imports: { app: '/assets/app.js' } });
    expect(assets.scripts).toEqual([{ url: '/assets/app.js', type: 'module' }]);
    expect(assets.styles).toEqual([{ url: '/assets/app.css' }]);
  });

  it('returns an empty pipeline for no assets', () => {
    const assets = normalizeNoAssets();

    expect(assets.pipeline).toBe('none');
    expect(assets.styles).toEqual([]);
    expect(assets.scripts).toEqual([]);
    expect(assets.importmap).toBeUndefined();
  });
});
