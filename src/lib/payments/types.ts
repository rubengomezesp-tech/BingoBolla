export interface PaymentProviderAdapter {
  createCheckoutSession(params: {
    packageId: string;
    packageSku: string;
    packageName: string;
    priceCents: number;
    userId: string;
    userEmail: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ id: string; url: string | null }>;
  
  verifyWebhook(rawBody: string, signature: string): Promise<any>;
  
  parseWebhookEvent(event: any): {
    userId: string;
    packageId: string;
    packageSku: string;
    amountCents: number;
    providerSessionId: string;
    sessionId: string;
    paymentId: string;
  } | null;
  
  verifyPayment(sessionId: string): Promise<{
    status: 'succeeded' | 'pending' | 'failed';
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
  }>;
}
