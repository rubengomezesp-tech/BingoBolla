import { NextResponse } from "next/server";
import {
  CURRENCIES,
  UUID_RE,
  apiError,
  readJsonRecord,
  readPositiveNumber,
  requireAuthenticatedUser,
  requireServiceClient,
} from "@/lib/server/api";

export const dynamic = "force-dynamic";

const ENGINE_RPC = {
  hold_win: "service_spin_hold_win",
  legacy: "service_play_slot",
  slot: "service_spin_slot",
} as const;
const SLUG_RE = /^[a-z0-9_-]{2,80}$/i;
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

  const engine = String(body.engine ?? "slot") as keyof typeof ENGINE_RPC;
  const currency = String(body.currency ?? "");
  const bet = readPositiveNumber(body.bet, 1_000_000);

  if (!ENGINE_RPC[engine] || !CURRENCIES.has(currency) || bet === null) {
    return apiError("invalid_spin", 400);
  }

  if (engine === "legacy") {
    const machineId = String(body.machine_id ?? "");
    if (!UUID_RE.test(machineId)) return apiError("invalid_machine", 400);

    const { data, error } = await service.supabase.rpc(ENGINE_RPC.legacy, {
      p_actor_id: auth.user.id,
      p_machine_id: machineId,
      p_bet: bet,
      p_currency: currency,
    });

    if (error) {
      console.error("[slots.spin.legacy]", error);
      return apiError(safeRpcError(error, "spin_failed"), 400);
    }

    return NextResponse.json({ data });
  }

  const slug = String(body.slug ?? "");
  if (!SLUG_RE.test(slug)) return apiError("invalid_machine", 400);

  const { data, error } = await service.supabase.rpc(ENGINE_RPC[engine], {
    p_actor_id: auth.user.id,
    p_slug: slug,
    p_currency: currency,
    p_bet: bet,
  });

  if (error) {
    console.error("[slots.spin]", error);
    return apiError(safeRpcError(error, "spin_failed"), 400);
  }

  return NextResponse.json({ data });
}
