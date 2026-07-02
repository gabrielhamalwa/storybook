import { SymfonyFrameworkError } from '../errors.ts';
import type { ServerState, StartServerOptions } from './types.ts';

export async function startFrankenPhpServer(options: StartServerOptions): Promise<ServerState> {
  throw new SymfonyFrameworkError(
    `FrankenPHP server backend is not yet implemented. Options: ${JSON.stringify(options)}`
  );
}
