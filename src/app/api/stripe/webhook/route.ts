import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripeAdapter } from "@/lib/payments/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "no_signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripeAdapter.verifyWebhook(rawBody, signature);
  } catch (err: any) {
    console.error("Stripe signature failed:", err.message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const parsed = stripeAdapter.parseWebhookEvent(event);
  if (!parsed) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "server_not_configured" }, { status: 500 });
  }

  const sb = createClient(
    supabaseUrl,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  const { data, error } = await sb.rpc("credit_purchase", {
    p_user_id: parsed.userId,
    p_package_id: parsed.packageId,
    p_amount_cents: parsed.amountCents,
    p_provider_session_id: parsed.providerSessionId,
    p_payment_id: parsed.paymentId,
  });

  if (error) {
    console.error("credit_purchase failed:", error);
    return NextResponse.json({ error: "credit_purchase_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: data });
}
