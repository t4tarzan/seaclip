/**
 * Ollama reachability health check
 */

export interface CheckResult {
  ok: boolean;
  label: string;
  detail?: string;
}

export async function checkOllama(baseUrl: string): Promise<CheckResult> {
  const label = 'Ollama';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, label, detail: `HTTP ${res.status} from ${baseUrl}` };
    }

    const data = (await res.json()) as { models?: unknown[] };
    const modelCount = Array.isArray(data.models) ? data.models.length : 0;
    return {
      ok: true,
      label,
      detail: `Reachable at ${baseUrl} — ${modelCount} model(s) available`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.includes('abort') || msg.includes('timeout');
    return {
      ok: false,
      label,
      detail: isTimeout
        ? `Timed out connecting to ${baseUrl}`
        : `Cannot reach ${baseUrl}: ${msg}`,
    };
  }
}
