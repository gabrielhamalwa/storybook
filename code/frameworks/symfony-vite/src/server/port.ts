import { createServer } from 'node:net';

import { SymfonyFrameworkError } from '../errors.ts';

export function getFreePort(preferredPort: number = 0): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();

    server.on('error', (error) => {
      reject(error);
    });

    server.listen(preferredPort, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        server.close(() => reject(new SymfonyFrameworkError('Unable to determine free port')));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}
