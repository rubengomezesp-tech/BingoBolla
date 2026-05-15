import Stripe from "stripe";
import { PaymentProviderAdapter } from "./types";

// Lazy initialization — Stripe se crea SOLO cuando se llama, no al importar el módulo.
// Esto permite que Next.js builde sin tener STRIPE_SECRET_KEY definido en build time.
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export const stripeAdapter: PaymentProviderAdapter = {
  async createCheckoutSession(params) {
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: params.userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: params.packageName,
              metadata: {
                packageId: params.packageId,
                packageSku: params.packageSku,
              },
            },
            unit_amount: params.priceCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.userId,
      metadata: {
        userId: params.userId,
        userEmail: params.userEmail,
        packageId: params.packageId,
        packageSku: params.packageSku,
        packageName: params.packageName,
      },
    });

    return { id: session.id, url: session.url };
  },

  async verifyWebhook(rawBody: string, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    return getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  },

  parseWebhookEvent(event: any) {
    if (event.type !== 'checkout.session.completed') return null;

    const session = event.data.object;
    const metadata = session.metadata || {};

    const userId = metadata.userId || session.client_reference_id;
    const packageId = metadata.packageId;
    const packageSku = metadata.packageSku;
    const amountCents = session.amount_total;
    const providerSessionId = session.id;
    const sessionId = session.id;
    const paymentId = session.payment_intent || session.id;

    if (!userId || !packageId) {
      console.error("Missing required metadata in webhook:", metadata);
      return null;
    }

    return { userId, packageId, packageSku, amountCents, providerSessionId, sessionId, paymentId };
  },

  async verifyPayment(sessionId: string) {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    let status: 'succeeded' | 'pending' | 'failed' = 'pending';
    if (session.payment_status === 'paid') status = 'succeeded';
    else if (session.payment_status === 'unpaid') status = 'failed';

    return {
      status,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || 'usd',
      metadata: session.metadata || undefined,
    };
  },
};
