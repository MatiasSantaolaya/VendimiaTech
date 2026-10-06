import crypto from 'node:crypto';
import type { PaymentProvider } from './types';

class HttpPaymentProvider implements PaymentProvider {
  async createCheckout(input: Parameters<PaymentProvider['createCheckout']>[0]) {
    const url = process.env.PAYMENT_API_BASE_URL?.replace(/\/$/, '');
    const key = process.env.PAYMENT_API_KEY;
    if (!url || !key) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
    const res = await fetch(`${url}/checkout`, { method:'POST', headers:{ Authorization:`Bearer ${key}`, 'Content-Type':'application/json' }, body:JSON.stringify(input), cache:'no-store' });
    if (!res.ok) throw new Error(`PAYMENT_PROVIDER_ERROR_${res.status}`);
    const data = await res.json();
    return { id:String(data.id), checkoutUrl:String(data.checkoutUrl), provider:process.env.PAYMENT_PROVIDER_NAME || 'custom' };
  }
  verifyWebhook(rawBody: string, signature: string | null) {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret || !signature) return false;
    const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const actual = signature.replace(/^sha256=/, '');
    return digest.length === actual.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(actual));
  }
}
export const paymentProvider: PaymentProvider = new HttpPaymentProvider();
