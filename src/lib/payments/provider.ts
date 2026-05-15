// Payment provider abstraction. Switching from Stripe to Nuvei = swap one import.

export type PaymentProvider = "stripe" | "nuvei" | "worldpay";
export const PAYMENT_PROVIDER: PaymentProvider =
  (process.env.PAYMENT_PROVIDER as PaymentProvider) ?? "stripe";

export interface CheckoutSessionInput {
  packageId: string;
  packageSku: string;
  packageName: string;
  priceCents: number;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export interface PaymentProviderAdapter {
  createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSession>;
  verifyWebhook(rawBody: string, signature: string): unknown;
  parseWebhookEvent(event: unknown): {
    type: string;
    sessionId: string;
    paymentId: string;
    customerEmail?: string;
  } | null;
}
