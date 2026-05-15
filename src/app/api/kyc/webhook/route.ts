// Persona webhook handler.
// Configure in Persona dashboard: webhook URL = https://yourdomain.com/api/kyc/webhook
// Verify signature with PERSONA_WEBHOOK_SECRET.

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("persona-signature");
  const secret = process.env.PERSONA_WEBHOOK_SECRET;

  // Skip verification if secret not configured (dev mode)
  if (secret && signature) {
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
    const sigPart = signature.split(",").find((p) => p.startsWith("v1="))?.replace("v1=", "");
    if (sigPart !== expected) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
  }

  const event = JSON.parse(body);
  const eventName = event?.data?.attributes?.name;
  const inquiry = event?.data?.attributes?.payload?.data;
  const status = inquiry?.attributes?.status;
  const referenceId = inquiry?.attributes?.["reference-id"];

  if (!referenceId) return NextResponse.json({ ok: true });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  if (eventName === "inquiry.approved" || status === "approved") {
    await sb.from("profiles").update({
      kyc_status: "verified",
      kyc_provider: "persona",
      kyc_provider_id: inquiry.id,
      kyc_verified_at: new Date().toISOString(),
    }).eq("id", referenceId);
  } else if (eventName === "inquiry.declined" || status === "declined") {
    await sb.from("profiles").update({
      kyc_status: "rejected",
      kyc_provider: "persona",
      kyc_provider_id: inquiry.id,
    }).eq("id", referenceId);
  }

  return NextResponse.json({ ok: true });
}
