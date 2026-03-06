/**
 * fetch() implementation with timeout, retry, response parsing.
 */

export interface HttpRequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  retries?: number;
}

export interface HttpResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
  durationMs: number;
  retryCount: number;
}

const RETRYABLE_STATUS_CODES = [429, 502, 503, 504];
const BASE_RETRY_DELAY_MS = 500;

export async function executeHttp(options: HttpRequestOptions): Promise<HttpResponse> {
  const {
    url,
    method = "GET",
    headers = {},
    body,
    timeoutMs = 30_000,
    retries = 2,
  } = options;

  let lastError: Error | undefined;
  let retryCount = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delay);
      retryCount++;
    }

    const startMs = Date.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(url, {
          method,
          headers,
          body,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      const responseBody = await response.text();
      const durationMs = Date.now() - startMs;

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      if (RETRYABLE_STATUS_CODES.includes(response.status) && attempt < retries) {
        lastError = new Error(
          `HTTP ${response.status} — will retry (attempt ${attempt + 1}/${retries})`,
        );
        continue;
      }

      return {
        statusCode: response.status,
        body: responseBody,
        headers: responseHeaders,
        durationMs,
        retryCount,
      };
    } catch (err) {
      const durationMs = Date.now() - startMs;
      lastError = err instanceof Error ? err : new Error(String(err));

      if (
        lastError.name === "AbortError" ||
        lastError.message.includes("abort")
      ) {
        throw new Error(
          `HTTP request to ${url} timed out after ${timeoutMs}ms (attempt ${attempt + 1})`,
        );
      }

      if (attempt >= retries) {
        throw new Error(
          `HTTP request to ${url} failed after ${retries + 1} attempts: ${lastError.message}`,
        );
      }
    }
  }

  throw lastError ?? new Error(`HTTP request to ${url} failed`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
