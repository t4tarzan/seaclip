/**
 * Telegram bot token validation check
 */

export interface CheckResult {
  ok: boolean;
  label: string;
  detail?: string;
}

export async function checkTelegram(botToken?: string): Promise<CheckResult> {
  const label = 'Telegram';

  if (!botToken) {
    return { ok: true, label, detail: 'Not configured (optional)' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = (await res.json()) as { ok: boolean; result?: { username?: string; first_name?: string }; description?: string };

    if (data.ok && data.result) {
      return {
        ok: true,
        label,
        detail: `Bot @${data.result.username ?? data.result.first_name} is valid`,
      };
    } else {
      return {
        ok: false,
        label,
        detail: `Invalid token: ${data.description ?? 'Unknown error'}`,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      label,
      detail: `Cannot reach Telegram API: ${msg}`,
    };
  }
}
