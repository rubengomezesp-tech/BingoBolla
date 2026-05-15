import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripeAdapter } from "@/lib/payments/stripe";

// Disable body parsing — Stripe needs raw body for signature verification
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "no_signature" }, { status: 400 });

  let event;
  try {
    event = stripeAdapter.verifyWebhook(rawBody, signature);
  } catch (err: any) {
    console.error("Stripe webhook signature failed:", err.message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const parsed = stripeAdapter.parseWebhookEvent(event);
  if (!parsed) return NextResponse.json({ ok: true, skipped: true });

  // Mark purchase complete via RPC (atomic + credits coins)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await admin.rpc("complete_purchase", {
    p_provider_session_id: parsed.sessionId,
    p_provider_payment_id: parsed.paymentId,
    p_raw_event: event as any,
  });

  if (error) {
    console.error("complete_purchase failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`✓ purchase completed: ${parsed.sessionId}`, data);
  return NextResponse.json({ ok: true });
}
