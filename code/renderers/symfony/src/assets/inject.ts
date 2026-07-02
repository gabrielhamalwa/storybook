import { global } from '@storybook/global';

import type { NormalizedAssets, ScriptAsset, StyleAsset } from './types.ts';

const STORYBOOK_SYMFONY_ASSET_CONTAINER = 'storybook-symfony-assets';

export interface InjectedElements {
  /** Remove all injected elements from the document. */
  cleanup: () => void;
}

export function injectAssets(assets: NormalizedAssets): InjectedElements {
  const container = getAssetContainer();
  const elements: HTMLElement[] = [];

  if (assets.importmap) {
    const script = document.createElement('script');
    script.type = 'importmap';
    script.textContent = JSON.stringify(assets.importmap);
    container.appendChild(script);
    elements.push(script);
  }

  assets.styles.forEach((style) => {
    const element = createStyleElement(style);
    container.appendChild(element);
    elements.push(element);
  });

  assets.scripts.forEach((script) => {
    const element = createScriptElement(script);
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

function createStyleElement(style: StyleAsset): HTMLElement {
  if (style.url) {
    const link = global.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = style.url;
    return link;
  }

  const styleElement = global.document.createElement('style');
  styleElement.textContent = style.content ?? '';
  return styleElement;
}

function createScriptElement(script: ScriptAsset): HTMLElement {
  const element = global.document.createElement('script');

  if (script.type === 'module') {
    element.type = 'module';
  }

  if (script.url) {
    element.src = script.url;
  } else {
    element.textContent = script.content ?? '';
  }

  return element;
}
