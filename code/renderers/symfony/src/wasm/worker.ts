/// <reference lib="webworker" />

import {
  PHP,
  PHPRequestHandler,
  loadPHPRuntime,
  resolvePHPExtension,
  withResolvedPHPExtensions,
} from '@php-wasm/universal';
import { getIntlExtensionPath, getPHPLoaderModule } from '@php-wasm/web-8-4';
import { unzipSync } from 'fflate';

import type { WorkerRequest, WorkerResponse, WorkerUpload } from './protocol.ts';

let handlerPromise: Promise<PHPRequestHandler> | undefined;
let requestQueue = Promise.resolve();

const STATIC_FILES_HEADER = 'x-storybook-symfony-uploaded-files';

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  requestQueue = requestQueue.catch(() => {}).then(() => handleRequest(event.data));
});

async function handleRequest(request: WorkerRequest): Promise<void> {
  try {
    const handler = await getHandler(request.archiveUrl);
    const uploads = await stageUploads(handler, request);
    let response;
    try {
      response = await handler.request({
        method: request.method,
        url: request.url,
        headers: {
          ...request.headers,
          ...(uploads.length
            ? { [STATIC_FILES_HEADER]: encodeBase64(JSON.stringify(uploads)) }
            : {}),
        },
        body: request.body,
      });
    } finally {
      await cleanupUploads(handler, uploads);
    }

    const message: WorkerResponse = {
      id: request.id,
      status: response.httpStatusCode,
      headers: response.headers,
      body: response.bytes,
    };

    self.postMessage(message, [response.bytes.buffer]);
  } catch (error) {
    const message: WorkerResponse = {
      id: request.id,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(message);
  }
}

type StagedUpload = Omit<WorkerUpload, 'bytes'> & { path: string };

async function stageUploads(
  handler: PHPRequestHandler,
  request: WorkerRequest
): Promise<StagedUpload[]> {
  if (!request.uploads?.length) {
    return [];
  }

  const php = await handler.getPrimaryPhp();
  const directory = `/tmp/storybook-uploads/${request.id}`;
  php.mkdirTree(directory);

  return request.uploads.map((upload, index) => {
    const path = `${directory}/${index}`;
    php.writeFile(path, upload.bytes);
    return { field: upload.field, name: upload.name, path, type: upload.type };
  });
}

async function cleanupUploads(handler: PHPRequestHandler, uploads: StagedUpload[]): Promise<void> {
  if (!uploads.length) {
    return;
  }

  const php = await handler.getPrimaryPhp();
  for (const upload of uploads) {
    try {
      php.unlink(upload.path);
    } catch {
      // The Live Action may have moved the upload into persistent storage.
    }
  }

  try {
    php.rmdir(uploads[0].path.slice(0, uploads[0].path.lastIndexOf('/')));
  } catch {
    // A moved upload or an application-created file can leave the directory non-empty.
  }
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function getHandler(archiveUrl: string): Promise<PHPRequestHandler> {
  handlerPromise ??= createHandler(archiveUrl);
  return handlerPromise;
}

async function createHandler(archiveUrl: string): Promise<PHPRequestHandler> {
  const [loader, intlUrl] = await Promise.all([getPHPLoaderModule(), getIntlExtensionPath()]);
  const intl = await resolvePHPExtension({
    name: 'intl',
    phpVersion: '8.4',
    source: { format: 'url', url: intlUrl },
  });
  const php = new PHP(await loadPHPRuntime(loader, withResolvedPHPExtensions({}, [intl])));
  const archiveResponse = await fetch(archiveUrl);

  if (!archiveResponse.ok) {
    throw new Error(
      `Unable to load the Symfony static runtime (${archiveResponse.status} ${archiveResponse.statusText}).`
    );
  }

  const files = unzipSync(new Uint8Array(await archiveResponse.arrayBuffer()));
  php.mkdirTree('/app');

  for (const [name, contents] of Object.entries(files)) {
    const normalized = normalizeArchiveEntry(name);
    if (!normalized || normalized.endsWith('/')) {
      continue;
    }

    const destination = `/app/${normalized}`;
    php.mkdirTree(destination.slice(0, destination.lastIndexOf('/')));
    php.writeFile(destination, contents);
  }

  return new PHPRequestHandler({
    phpFactory: async () => php,
    documentRoot: '/app/public',
    absoluteUrl: 'http://storybook.local',
    getFileNotFoundAction: () => ({ type: 'internal-redirect', uri: '/index.php' }),
  });
}

function normalizeArchiveEntry(name: string): string {
  const normalized = name.replaceAll('\\', '/').replace(/^\.\//, '');
  const segments = normalized.split('/');

  if (normalized.startsWith('/') || segments.some((segment) => segment === '..')) {
    throw new Error(`Unsafe path in Symfony static runtime archive: ${name}`);
  }

  return normalized;
}
