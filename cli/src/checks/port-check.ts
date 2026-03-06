/**
 * TCP port availability check
 */

import net from 'net';

export interface CheckResult {
  ok: boolean;
  label: string;
  detail?: string;
}

/**
 * Check whether a TCP port is free (not in use) on the local machine.
 */
export async function checkPort(port: number, host = '0.0.0.0'): Promise<CheckResult> {
  const label = `Port ${port}`;
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve({
          ok: false,
          label,
          detail: `Port ${port} is already in use`,
        });
      } else {
        resolve({
          ok: false,
          label,
          detail: `Error checking port ${port}: ${err.message}`,
        });
      }
    });

    server.once('listening', () => {
      server.close(() => {
        resolve({
          ok: true,
          label,
          detail: `Port ${port} is available on ${host}`,
        });
      });
    });

    server.listen(port, host);
  });
}
