import { describe, expect, it } from 'vitest';

import { generateServiceWorker, generateServiceWorkerRegistration } from './service-worker.ts';

describe('generateServiceWorker', () => {
  it('generates SW code with the provided URLs', () => {
    const code = generateServiceWorker({
      phpWasmUrl: '/php-cgi-wasm.js',
      projectArchiveUrl: '/symfony-project.tar.gz',
    });

    expect(code).toContain('"/php-cgi-wasm.js"');
    expect(code).toContain('"/symfony-project.tar.gz"');
    expect(code).toContain('importScripts(PHP_WASM_URL)');
    expect(code).toContain('self.PHP');
    expect(code).toContain("self.addEventListener('install'");
    expect(code).toContain("self.addEventListener('activate'");
    expect(code).toContain("self.addEventListener('fetch'");
  });

  it('uses custom cache name when provided', () => {
    const code = generateServiceWorker({
      phpWasmUrl: '/php.js',
      projectArchiveUrl: '/project.tar.gz',
      cacheName: 'custom-cache',
    });

    expect(code).toContain('"custom-cache"');
  });

  it('uses default cache name when not provided', () => {
    const code = generateServiceWorker({
      phpWasmUrl: '/php.js',
      projectArchiveUrl: '/project.tar.gz',
    });

    expect(code).toContain('"storybook-symfony-wasm"');
  });

  it('intercepts only /_storybook/ and /_live_component/ requests', () => {
    const code = generateServiceWorker({
      phpWasmUrl: '/php.js',
      projectArchiveUrl: '/project.tar.gz',
    });

    expect(code).toContain('/_storybook/');
    expect(code).toContain('/_live_component/');
  });
});

describe('generateServiceWorkerRegistration', () => {
  it('generates registration code for the given SW path', () => {
    const code = generateServiceWorkerRegistration('/sw.js');

    expect(code).toContain("navigator.serviceWorker");
    expect(code).toContain('register("/sw.js")');
    expect(code).toContain('__STORYBOOK_SYMFONY_SW_READY__');
  });

  it('checks for serviceWorker support before registering', () => {
    const code = generateServiceWorkerRegistration('/sw.js');

    expect(code).toContain("'serviceWorker' in navigator");
  });
});
