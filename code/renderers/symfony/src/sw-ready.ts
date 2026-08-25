import { SymfonyRendererError } from './errors.ts';

/**
 * Service Worker ready-state management for PHP-WASM mode.
 *
 * In WASM build mode, a Service Worker intercepts fetch requests to /_storybook/*
 * and renders them using PHP-WASM. The frontend must wait for the SW to be active
 * before attempting to render any stories.
 */

declare global {
  interface ImportMetaEnv {
    STORYBOOK_MODE?: string;
  }
}

let swReadyPromise: Promise<void> | null = null;

/**
 * Returns a promise that resolves when the Service Worker is active and ready
 * to handle requests. In non-WASM modes, resolves immediately.
 */
export function waitForServiceWorker(): Promise<void> {
  if (swReadyPromise) {
    return swReadyPromise;
  }

  const mode = import.meta.env.STORYBOOK_MODE as string | undefined;

  // In non-WASM modes, no SW is needed
  if (mode !== 'wasm') {
    swReadyPromise = Promise.resolve();
    return swReadyPromise;
  }

  swReadyPromise = new Promise<void>((resolve, reject) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker) {
      reject(
        new SymfonyRendererError(
          'Service Worker is not supported in this browser, but buildMode is "wasm"'
        )
      );
      return;
    }

    // Check if the SW registration promise is already set by the registration script
    const globalWithSw = globalThis as typeof globalThis & {
      __STORYBOOK_SYMFONY_SW_READY__?: Promise<unknown>;
    };

    if (globalWithSw.__STORYBOOK_SYMFONY_SW_READY__) {
      globalWithSw.__STORYBOOK_SYMFONY_SW_READY__.then(() => resolve()).catch(reject);
      return;
    }

    // If no registration script was loaded, register the SW ourselves
    // eslint-disable-next-line compat/compat
    const swContainer = navigator.serviceWorker;
    if (!swContainer) {
      reject(new SymfonyRendererError('Service Worker is not available in this browser'));
      return;
    }

    swContainer
      .register('/sw.js')
      .then((registration) => {
        const checkActive = () => {
          if (registration.active) {
            resolve();
          } else {
            setTimeout(checkActive, 100);
          }
        };
        checkActive();
      })
      .catch((error) => {
        reject(new SymfonyRendererError(`Failed to register Service Worker: ${error.message}`));
      });
  });

  return swReadyPromise;
}

/**
 * Checks if the current build mode uses a Service Worker for rendering.
 */
export function isServiceWorkerMode(): boolean {
  return (import.meta.env.STORYBOOK_MODE as string | undefined) === 'wasm';
}
