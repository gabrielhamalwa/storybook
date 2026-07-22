import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WorkerRequest, WorkerResponse } from './protocol.ts';

type MessageListener = (event: MessageEvent<WorkerResponse>) => void;

describe('requestSymfonyWasm', () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { [key: symbol]: boolean })[
      Symbol.for('storybook.symfony.wasm.fetch-bridge')
    ];
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('sets the content length after converting a request body to bytes', async () => {
    let postedRequest: WorkerRequest | undefined;
    let messageListener: MessageListener | undefined;

    class WorkerMock {
      addEventListener(type: string, listener: MessageListener) {
        if (type === 'message') {
          messageListener = listener;
        }
      }

      postMessage(message: WorkerRequest) {
        postedRequest = message;
        messageListener?.({
          data: { headers: {}, id: message.id, status: 204 },
        } as MessageEvent<WorkerResponse>);
      }
    }

    vi.stubGlobal('document', { baseURI: 'https://example.com/design-system/' });
    vi.stubGlobal('Worker', WorkerMock);
    const { requestSymfonyWasm } = await import('./client.ts');
    const body = 'data=%7B%22args%22%3A%7B%7D%7D';

    await requestSymfonyWasm('/storybook-symfony/app.zip', '/_components/Counter/increment', {
      body,
      headers: {
        'content-length': '1',
        'content-type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    });

    expect(postedRequest?.headers).toMatchObject({
      'content-length': String(new TextEncoder().encode(body).byteLength),
      'content-type': 'application/x-www-form-urlencoded',
    });
  });

  it('provides static Symfony with a browser-independent form-field envelope', async () => {
    let postedRequest: WorkerRequest | undefined;
    let messageListener: MessageListener | undefined;

    class WorkerMock {
      addEventListener(type: string, listener: MessageListener) {
        if (type === 'message') {
          messageListener = listener;
        }
      }

      postMessage(message: WorkerRequest) {
        postedRequest = message;
        messageListener?.({
          data: { headers: {}, id: message.id, status: 204 },
        } as MessageEvent<WorkerResponse>);
      }
    }

    vi.stubGlobal('document', { baseURI: 'https://example.com/design-system/' });
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('location', new URL('https://example.com/design-system/iframe.html'));
    vi.stubGlobal('Worker', WorkerMock);
    const { installLiveComponentFetchBridge } = await import('./client.ts');
    const formData = new FormData();
    formData.append('data', '{"message":"Grüße"}');
    formData.append('tags[]', 'one');
    formData.append('tags[]', 'two');
    formData.append(
      'my_file',
      new Blob(['Symfony static upload'], { type: 'text/plain' }),
      'upload.txt'
    );

    installLiveComponentFetchBridge('/storybook-symfony/app.zip');
    await globalThis.fetch('/_components/Counter/increment', { body: formData, method: 'POST' });

    const envelope = postedRequest?.headers?.['x-storybook-symfony-form-data'];
    expect(envelope).toBeTypeOf('string');
    expect(
      new TextDecoder().decode(Uint8Array.from(atob(envelope!), (byte) => byte.charCodeAt(0)))
    ).toBe('data=%7B%22message%22%3A%22Gr%C3%BC%C3%9Fe%22%7D&tags%5B%5D=one&tags%5B%5D=two');
    expect(postedRequest?.uploads).toEqual([
      expect.objectContaining({
        field: 'my_file',
        name: 'upload.txt',
        type: 'text/plain',
        bytes: new TextEncoder().encode('Symfony static upload'),
      }),
    ]);
  });
});
