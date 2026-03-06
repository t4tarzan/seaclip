/**
 * Database connectivity health check
 */

import net from 'net';

export interface CheckResult {
  ok: boolean;
  label: string;
  detail?: string;
}

export async function checkDatabase(connectionString?: string): Promise<CheckResult> {
  const label = 'Database';

  if (!connectionString || connectionString.startsWith('file:')) {
    // Embedded SQLite — just mark as ok (no remote to ping)
    return { ok: true, label, detail: 'Embedded SQLite (no remote connection required)' };
  }

  try {
    const url = new URL(connectionString);
    const host = url.hostname;
    const port = parseInt(url.port || '5432', 10);

    await tcpPing(host, port, 3000);
    return { ok: true, label, detail: `Reachable at ${host}:${port}` };
  } catch (err) {
    return {
      ok: false,
      label,
      detail: `Cannot connect: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function tcpPing(host: string, port: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error(`TCP connection to ${host}:${port} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.connect(port, host, () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve();
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.destroy();
      reject(err);
    });
  });
}
