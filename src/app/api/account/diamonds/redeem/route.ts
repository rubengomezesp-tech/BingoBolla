import { NextResponse } from "next/server";
import {
  apiError,
  readJsonRecord,
  readPositiveNumber,
  requireAuthenticatedUser,
  requireServiceClient,
  safeRpcError,
} from "@/lib/server/api";

export const dynamic = "force-dynamic";

const METHODS = new Set(["paypal", "bank_transfer"]);

function buildPaymentDetails(method: string, value: unknown) {
  const detail = typeof value === "string" ? value.trim() : "";
  if (detail.length < 3 || detail.length > 180) return null;

  if (method === "paypal") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(detail)) return null;
    return { email: detail };
  }

  const iban = detail.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9]{8,34}$/.test(iban)) return null;
  return { iban };
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const body = await readJsonRecord(request);
  if (!body) return apiError("invalid_json", 400);

  const amount = readPositiveNumber(body.diamond_amount, 1_000_000);
  const method = String(body.payment_method ?? "");
  if (amount === null || amount < 100 || !METHODS.has(method)) {
    return apiError("invalid_redemption", 400);
  }

  const paymentDetails = buildPaymentDetails(method, body.payment_detail);
  if (!paymentDetails) return apiError("invalid_payment_details", 400);

  const { data, error } = await service.supabase.rpc("service_request_diamond_redemption", {
    p_actor_id: auth.user.id,
    p_diamond_amount: amount,
    p_payment_method: method,
    p_payment_details: paymentDetails,
  });

  if (error) {
    return apiError(safeRpcError(error, "diamond_redemption_failed"), 400);
  }

  return NextResponse.json({ data });
}
