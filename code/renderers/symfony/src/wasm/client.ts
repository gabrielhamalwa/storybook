import { SymfonyRendererError } from '../errors.ts';

import type { WorkerRequest, WorkerResponse, WorkerUpload } from './protocol.ts';

type PendingRequest = {
  reject: (error: Error) => void;
  resolve: (response: Response) => void;
};

type SymfonyWasmRequestInit = RequestInit & {
  uploads?: WorkerUpload[];
};

const LIVE_COMPONENT_PATH = /(?:^|\/)\_components(?:\/|$)/;
const FETCH_BRIDGE_MARKER = Symbol.for('storybook.symfony.wasm.fetch-bridge');
const STATIC_FORM_DATA_HEADER = 'x-storybook-symfony-form-data';

let bridge: SymfonyWasmBridge | undefined;

export async function requestSymfonyWasm(
  archiveUrl: string,
  url: string,
  init: SymfonyWasmRequestInit
): Promise<Response> {
  bridge ??= new SymfonyWasmBridge(archiveUrl);
  return bridge.request(url, init);
}

export function installLiveComponentFetchBridge(archiveUrl: string): void {
  const runtimeGlobal = globalThis as typeof globalThis & {
    [FETCH_BRIDGE_MARKER]?: boolean;
  };

  if (runtimeGlobal[FETCH_BRIDGE_MARKER]) {
    return;
  }

  const browserFetch = globalThis.fetch.bind(globalThis);
  runtimeGlobal[FETCH_BRIDGE_MARKER] = true;
  globalThis.fetch = async (input, init) => {
    const request = createRequest(input, init);
    const url = new URL(request.url);

    if (url.origin !== globalThis.location.origin || !LIVE_COMPONENT_PATH.test(url.pathname)) {
      return browserFetch(input, init);
    }

    const headers = new Headers(request.headers);
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
    const formData = hasBody ? await extractStaticFormData(request) : undefined;
    const body = hasBody ? new Uint8Array(await request.arrayBuffer()) : undefined;
    if (formData?.fields) {
      headers.set(STATIC_FORM_DATA_HEADER, formData.fields);
    }
    return requestSymfonyWasm(archiveUrl, `${extractSymfonyPath(url.pathname)}${url.search}`, {
      method: request.method,
      headers,
      body,
      uploads: formData?.uploads,
    });
  };
}

export function getStaticAssetBaseUrl(archiveUrl: string): string | undefined {
  const archive = new URL(archiveUrl, globalThis.document.baseURI);
  const directory = new URL('../', archive).pathname.replace(/\/$/, '');
  return directory || undefined;
}

class SymfonyWasmBridge {
  readonly #archiveUrl: string;
  readonly #pending = new Map<number, PendingRequest>();
  readonly #worker: Worker;
  #requestId = 0;

  constructor(archiveUrl: string) {
    this.#archiveUrl = new URL(archiveUrl, globalThis.document.baseURI).href;
    this.#worker = new Worker(new URL('./wasm/worker.js', import.meta.url), { type: 'module' });
    this.#worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      this.#handleResponse(event.data);
    });
    this.#worker.addEventListener('error', (event) => {
      const error = new SymfonyRendererError(
        event.message || 'The Symfony PHP-WASM worker crashed.'
      );
      for (const pending of this.#pending.values()) {
        pending.reject(error);
      }
      this.#pending.clear();
    });
  }

  async request(url: string, init: SymfonyWasmRequestInit): Promise<Response> {
    const id = ++this.#requestId;
    const body = await readBody(init.body);
    const headers = new Headers(init.headers);
    if (body !== undefined) {
      headers.set('content-length', String(body.byteLength));
    }
    const message: WorkerRequest = {
      archiveUrl: this.#archiveUrl,
      body,
      headers: Object.fromEntries(headers.entries()),
      id,
      method: (init.method ?? 'GET') as WorkerRequest['method'],
      uploads: init.uploads,
      url,
    };

    const response = new Promise<Response>((resolve, reject) => {
      this.#pending.set(id, { reject, resolve });
    });

    this.#worker.postMessage(message, body ? { transfer: [body.buffer] } : undefined);
    return response;
  }

  #handleResponse(message: WorkerResponse): void {
    const pending = this.#pending.get(message.id);
    if (!pending) {
      return;
    }
    this.#pending.delete(message.id);

    if (message.error) {
      pending.reject(new SymfonyRendererError(message.error));
      return;
    }

    const headers = new Headers();
    for (const [name, values] of Object.entries(message.headers ?? {})) {
      for (const value of values) {
        headers.append(name, value);
      }
    }

    const status = message.status ?? 500;
    const body =
      status === 204 || status === 304 || !message.body
        ? null
        : (new Uint8Array(message.body).buffer as ArrayBuffer);
    pending.resolve(new Response(body, { status, headers }));
  }
}

function createRequest(input: RequestInfo | URL, init?: RequestInit): Request {
  if (typeof input === 'string') {
    return new Request(new URL(input, globalThis.location.href), init);
  }
  return new Request(input, init);
}

function extractSymfonyPath(pathname: string): string {
  const marker = pathname.indexOf('/_components');
  return marker === -1 ? pathname : pathname.slice(marker);
}

async function readBody(body: BodyInit | null | undefined): Promise<Uint8Array | undefined> {
  if (body == null) {
    return undefined;
  }

  if (typeof body === 'string') {
    return new TextEncoder().encode(body);
  }

  if (body instanceof Uint8Array) {
    return body;
  }

  if (body instanceof ArrayBuffer) {
    return new Uint8Array(body);
  }

  return new Uint8Array(await new Response(body).arrayBuffer());
}

async function extractStaticFormData(
  request: Request
): Promise<{ fields: string; uploads: WorkerUpload[] } | undefined> {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) {
    return undefined;
  }

  const parameters = new URLSearchParams();
  const uploads: WorkerUpload[] = [];
  for (const [name, value] of await request.clone().formData()) {
    if (typeof value === 'string') {
      parameters.append(name, value);
    } else {
      uploads.push({
        bytes: new Uint8Array(await value.arrayBuffer()),
        field: name,
        name: value.name,
        type: value.type || 'application/octet-stream',
      });
    }
  }

  return { fields: encodeBase64(parameters.toString()), uploads };
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}
