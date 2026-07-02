/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { injectAssets } from './inject.ts';

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
