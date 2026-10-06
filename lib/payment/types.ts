export type CheckoutRequest = { orderId: string; amountCents: number; currency: string; buyerEmail: string; returnUrl: string };
export type PaymentCheckout = { id: string; checkoutUrl: string; provider: string };
export interface PaymentProvider {
  createCheckout(input: CheckoutRequest): Promise<PaymentCheckout>;
  verifyWebhook(rawBody: string, signature: string | null): boolean;
}
