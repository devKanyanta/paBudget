// SMS gateway adapter. Production: Africa's Talking (set AT_USERNAME / AT_API_KEY). Otherwise logs to console.
export const sentCodes = new Map<string, string>(); // test/dev inspection only

export async function sendSms(phone: string, text: string) {
  const code = /(\d{6})/.exec(text)?.[1];
  if (code) sentCodes.set(phone, code);
  const user = process.env.AT_USERNAME, key = process.env.AT_API_KEY;
  if (!user || !key) {
    if (process.env.NODE_ENV !== 'test') console.log(`[sms:dev] to ${phone}: ${text}`);
    return;
  }
  const host = user === 'sandbox' ? 'api.sandbox.africastalking.com' : 'api.africastalking.com';
  const res = await fetch(`https://${host}/version1/messaging`, {
    method: 'POST',
    headers: { apiKey: key, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ username: user, to: phone, message: text }),
  });
  if (!res.ok) throw new Error(`SMS gateway error ${res.status}`);
}
