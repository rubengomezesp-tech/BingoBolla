import { NextResponse } from "next/server";
import {
  UUID_RE,
  apiError,
  readJsonRecord,
  requireAuthenticatedUser,
  requireServiceClient,
} from "@/lib/server/api";

export const dynamic = "force-dynamic";

const ALLOWED_CURRENCIES = new Set(["gold", "sweeps"]);
const ALLOWED_PURCHASES = new Set(["ticket", "strip"]);
const SAFE_RPC_ERROR = /^[a-z0-9_]+$/i;

function safeRpcError(error: unknown, fallback: string) {
  const message = typeof error === "object" && error && "message" in error ? String(error.message) : "";
  return SAFE_RPC_ERROR.test(message) ? message : fallback;
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const body = await readJsonRecord(request);
  if (!body) return apiError("invalid_json", 400);

  const roomId = String(body.room_id ?? "");
  const currency = String(body.currency ?? "");
  const purchase = String(body.purchase ?? "");

  if (!UUID_RE.test(roomId) || !ALLOWED_CURRENCIES.has(currency) || !ALLOWED_PURCHASES.has(purchase)) {
    return apiError("invalid_purchase", 400);
  }

  const rpc = purchase === "strip" ? "service_buy_strip" : "service_buy_ticket";
  const { data, error } = await service.supabase.rpc(rpc, {
    p_actor_id: auth.user.id,
    p_room_id: roomId,
    p_currency: currency,
  });

  if (error) {
    console.error("[room.purchase]", error);
    return apiError(safeRpcError(error, "purchase_failed"), 400);
  }

  return NextResponse.json({ data });
}
