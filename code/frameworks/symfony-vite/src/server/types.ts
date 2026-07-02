export interface ServerState {
  /** The URL the server is listening on. */
  url: string;
  /** Stops the server. */
  stop: () => Promise<void>;
}

export interface StartServerOptions {
  environment: string;
  projectDir: string;
  publicDir: string;
  port: number;
  phpBinary: string;
  console: string;
}
