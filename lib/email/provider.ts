import type { EmailMessage, EmailProvider } from './types';

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    const id = `dev_${Date.now()}`;
    if (process.env.NODE_ENV !== 'production') console.info('[PlanE email]', { id, to: message.to, subject: message.subject });
    return { id, accepted: true };
  }
}

class HttpEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    const url = process.env.EMAIL_API_BASE_URL?.replace(/\/$/, '');
    const key = process.env.EMAIL_API_KEY;
    if (!url || !key) throw new Error('EMAIL_PROVIDER_NOT_CONFIGURED');
    const res = await fetch(`${url}/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...message, from: message.from || process.env.EMAIL_FROM || 'PlanE <noreply@plane.events>' }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`EMAIL_PROVIDER_ERROR_${res.status}`);
    const data = await res.json().catch(() => ({}));
    return { id: String(data.id || `email_${Date.now()}`), accepted: true };
  }
}

export const emailProvider: EmailProvider = process.env.EMAIL_API_BASE_URL ? new HttpEmailProvider() : new ConsoleEmailProvider();
