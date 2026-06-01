// Persona webhook handler.
// Configure in Persona dashboard: webhook URL = https://yourdomain.com/api/kyc/webhook
// Verify signature with PERSONA_WEBHOOK_SECRET.

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import crypto from "crypto";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function timingSafeHexEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("persona-signature");
  const secret = process.env.PERSONA_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "webhook_secret_not_configured" }, { status: 500 });
  }
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 401 });
  }

  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const sigPart = signature.split(",").find((p) => p.trim().startsWith("v1="))?.trim().replace("v1=", "");
  if (!sigPart || !/^[a-f0-9]+$/i.test(sigPart) || !timingSafeHexEqual(sigPart, expected)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "server_not_configured" }, { status: 500 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const eventName = event?.data?.attributes?.name;
  const inquiry = event?.data?.attributes?.payload?.data;
  const status = inquiry?.attributes?.status;
  const referenceId = inquiry?.attributes?.["reference-id"];

  if (!referenceId) return NextResponse.json({ ok: true });
  if (!UUID_RE.test(referenceId)) {
    return NextResponse.json({ error: "invalid_reference" }, { status: 400 });
  }

  const sb = createClient(
    supabaseUrl,
    serviceRoleKey,
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
