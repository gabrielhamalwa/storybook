import type { HTTPMethod } from '@php-wasm/universal';

export type WorkerUpload = {
  bytes: Uint8Array;
  field: string;
  name: string;
  type: string;
};

export type WorkerRequest = {
  archiveUrl: string;
  body?: Uint8Array;
  headers?: Record<string, string>;
  id: number;
  method: HTTPMethod;
  uploads?: WorkerUpload[];
  url: string;
};

export type WorkerResponse = {
  body?: Uint8Array;
  error?: string;
  headers?: Record<string, string[]>;
  id: number;
  status?: number;
};
