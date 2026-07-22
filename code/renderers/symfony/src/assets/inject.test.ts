/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { injectAssets, resolveAssetUrl } from './inject.ts';

describe('injectAssets', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    const container = document.getElementById('storybook-symfony-assets');
    container?.remove();
  });

  it('injects a stylesheet link for a URL style', () => {
    const injected = injectAssets({ styles: [{ url: 'data:text/css,body%7B%7D' }], scripts: [] });

    const link = document.querySelector('link[rel="stylesheet"]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('data:text/css,body%7B%7D');

    injected.cleanup();
    expect(document.querySelector('link[rel="stylesheet"]')).toBeNull();
  });

  it('injects a style tag for inline CSS', () => {
    const injected = injectAssets({ styles: [{ content: 'body { color: red; }' }], scripts: [] });

    const style = document.querySelector('style');
    expect(style).not.toBeNull();
    expect(style?.textContent).toBe('body { color: red; }');

    injected.cleanup();
  });

  it('injects a module script for a URL script', () => {
    const injected = injectAssets({
      styles: [],
      scripts: [{ url: 'data:text/javascript,', type: 'module' }],
    });

    const script = document.querySelector('script[type="module"]');
    expect(script).not.toBeNull();
    expect(script?.getAttribute('src')).toBe('data:text/javascript,');

    injected.cleanup();
  });

  it('resolves backend-relative asset URLs', () => {
    expect(resolveAssetUrl('/assets/app.css', 'http://127.0.0.1:8000')).toBe(
      'http://127.0.0.1:8000/assets/app.css'
    );
    expect(resolveAssetUrl('data:text/javascript,', 'http://127.0.0.1:8000')).toBe(
      'data:text/javascript,'
    );
  });

  it('routes relative assets through a same-origin backend proxy', () => {
    expect(resolveAssetUrl('/assets/app.js', '/__storybook_symfony')).toBe('/assets/app.js');
    expect(resolveAssetUrl('build/app.css', '/__storybook_symfony')).toBe(
      '/__storybook_symfony/build/app.css'
    );
  });

  it('rebases root-relative assets for a nested static Storybook', () => {
    expect(resolveAssetUrl('/build/assets/app.css', '/design-system', true)).toBe(
      '/design-system/build/assets/app.css'
    );
  });

  it('resolves backend-relative import-map URLs', () => {
    injectAssets(
      {
        styles: [],
        scripts: [],
        importmap: { imports: { app: '/assets/app.js' } },
      },
      'http://127.0.0.1:8000'
    );

    expect(document.querySelector('script[type="importmap"]')?.textContent).toContain(
      'http://127.0.0.1:8000/assets/app.js'
    );
  });

  it('injects an importmap before module scripts', () => {
    const injected = injectAssets({
      styles: [],
      importmap: { imports: { app: 'data:text/javascript,' } },
      scripts: [{ url: 'data:text/javascript,', type: 'module' }],
    });

    const importmap = document.querySelector('script[type="importmap"]');
    expect(importmap).not.toBeNull();
    expect(importmap?.textContent).toContain('"data:text/javascript,"');

    injected.cleanup();
  });

  it('deduplicates assets by removing only the injected container', () => {
    const injected = injectAssets({
      styles: [{ url: 'data:text/css,' }],
      scripts: [{ url: 'data:text/javascript,', type: 'module' }],
    });

    const container = document.getElementById('storybook-symfony-assets');
    expect(container).not.toBeNull();
    expect(container?.children.length).toBe(2);

    injected.cleanup();
    expect(document.getElementById('storybook-symfony-assets')).toBeNull();
  });
});
