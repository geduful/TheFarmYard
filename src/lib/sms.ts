/**
 * Server-only SMS helper (transactional alerts: payment confirmed, dispatched,
 * released). No-op with a warning when unconfigured so dev/demo keeps working.
 *
 * Default provider: Arkesel (Ghana). Set SMS_PROVIDER=africastalking to use
 * Africa's Talking continent-wide instead.
 *
 * Env: SMS_API_KEY (+ SMS_SENDER, SMS_USERNAME for Africa's Talking)
 */

type Provider = 'arkesel' | 'africastalking';

function provider(): Provider {
  return process.env.SMS_PROVIDER === 'africastalking' ? 'africastalking' : 'arkesel';
}

export function isSmsConfigured(): boolean {
  return !!process.env.SMS_API_KEY;
}

async function sendViaArkesel(to: string, message: string): Promise<void> {
  const res = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: {
      'api-key': process.env.SMS_API_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: process.env.SMS_SENDER || 'TheFarmYard',
      message,
      recipients: [to],
    }),
  });
  if (!res.ok) throw new Error(`Arkesel SMS failed (${res.status})`);
}

async function sendViaAfricasTalking(to: string, message: string): Promise<void> {
  const params = new URLSearchParams({
    username: process.env.SMS_USERNAME || 'TheFarmYard',
    to,
    message,
    from: process.env.SMS_SENDER || 'TheFarmYard',
  });
  const res = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      apiKey: process.env.SMS_API_KEY as string,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Africa's Talking SMS failed (${res.status})`);
}

/** Fire-and-forget safe: logs and swallows errors so SMS never breaks payments. */
export async function sendSms(to: string | null | undefined, message: string): Promise<void> {
  if (!to || !isSmsConfigured()) return;
  try {
    if (provider() === 'africastalking') await sendViaAfricasTalking(to, message);
    else await sendViaArkesel(to, message);
  } catch (err) {
    console.error('[sms] send failed:', err instanceof Error ? err.message : err);
  }
}
