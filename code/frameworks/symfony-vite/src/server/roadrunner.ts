import { SymfonyFrameworkError } from '../errors.ts';
import type { ServerState, StartServerOptions } from './types.ts';

export async function startRoadRunnerServer(options: StartServerOptions): Promise<ServerState> {
  throw new SymfonyFrameworkError(
    `RoadRunner server backend is not yet implemented. Options: ${JSON.stringify(options)}`
  );
}
