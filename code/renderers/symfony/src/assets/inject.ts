import { global } from '@storybook/global';

import type { ImportMap, NormalizedAssets, ScriptAsset, StyleAsset } from './types.ts';

const STORYBOOK_SYMFONY_ASSET_CONTAINER = 'storybook-symfony-assets';

export interface InjectedElements {
  /** Remove all injected elements from the document. */
  cleanup: () => void;
}

export function injectAssets(
  assets: NormalizedAssets,
  serverUrl?: string,
  rebaseRootRelative = false
): InjectedElements {
  const container = getAssetContainer();
  const elements: HTMLElement[] = [];

  if (assets.importmap) {
    const script = document.createElement('script');
    script.type = 'importmap';
    script.textContent = JSON.stringify(
      resolveImportMap(assets.importmap, serverUrl, rebaseRootRelative)
    );
    container.appendChild(script);
    elements.push(script);
  }

  assets.styles.forEach((style) => {
    const element = createStyleElement(style, serverUrl, rebaseRootRelative);
    container.appendChild(element);
    elements.push(element);
  });

  assets.scripts.forEach((script) => {
    const element = createScriptElement(script, serverUrl, rebaseRootRelative);
    container.appendChild(element);
    elements.push(element);
  });

  return {
    cleanup: () => {
      elements.forEach((element) => {
        element.remove();
      });
      if (container.childNodes.length === 0) {
        container.remove();
      }
    },
  };
}

function getAssetContainer(): HTMLElement {
  const existing = global.document.getElementById(STORYBOOK_SYMFONY_ASSET_CONTAINER);
  if (existing) {
    return existing;
  }

  const container = global.document.createElement('div');
  container.id = STORYBOOK_SYMFONY_ASSET_CONTAINER;
  container.style.display = 'none';
  global.document.head.appendChild(container);
  return container;
}

function createStyleElement(
  style: StyleAsset,
  serverUrl?: string,
  rebaseRootRelative = false
): HTMLElement {
  if (style.url) {
    const link = global.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = resolveAssetUrl(style.url, serverUrl, rebaseRootRelative);
    return link;
  }

  const styleElement = global.document.createElement('style');
  styleElement.textContent = style.content ?? '';
  return styleElement;
}

function createScriptElement(
  script: ScriptAsset,
  serverUrl?: string,
  rebaseRootRelative = false
): HTMLElement {
  const element = global.document.createElement('script');

  if (script.type === 'module') {
    element.type = 'module';
  }

  if (script.url) {
    element.src = resolveAssetUrl(script.url, serverUrl, rebaseRootRelative);
  } else {
    element.textContent = script.content ?? '';
  }

  return element;
}

function resolveImportMap(
  importMap: ImportMap,
  serverUrl?: string,
  rebaseRootRelative = false
): ImportMap {
  return {
    ...importMap,
    imports: resolveImportEntries(importMap.imports, serverUrl, rebaseRootRelative),
    scopes: importMap.scopes
      ? Object.fromEntries(
          Object.entries(importMap.scopes).map(([scope, entries]) => [
            resolveAssetUrl(scope, serverUrl, rebaseRootRelative),
            resolveImportEntries(entries, serverUrl, rebaseRootRelative) ?? {},
          ])
        )
      : undefined,
  };
}

function resolveImportEntries(
  entries: Record<string, string> | undefined,
  serverUrl?: string,
  rebaseRootRelative = false
): Record<string, string> | undefined {
  return entries
    ? Object.fromEntries(
        Object.entries(entries).map(([specifier, url]) => [
          specifier,
          resolveAssetUrl(url, serverUrl, rebaseRootRelative),
        ])
      )
    : undefined;
}

export function resolveAssetUrl(
  url: string,
  serverUrl?: string,
  rebaseRootRelative = false
): string {
  if (!serverUrl || /^(?:[a-z]+:)?\/\//i.test(url) || /^(?:data|blob):/i.test(url)) {
    return url;
  }

  if (serverUrl.startsWith('/')) {
    if (url.startsWith('/') && !rebaseRootRelative) {
      return url;
    }
    return `${serverUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  }

  return new URL(url, `${serverUrl.replace(/\/$/, '')}/`).href;
}
