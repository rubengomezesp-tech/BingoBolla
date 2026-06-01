import { NextResponse } from "next/server";
import {
  apiError,
  readJsonRecord,
  requireAuthenticatedUser,
  requireServiceClient,
  safeRpcError,
} from "@/lib/server/api";

export const dynamic = "force-dynamic";

const PERIODS = new Set(["24h", "7d", "30d", "6m", "1y", "permanent"]);

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const body = await readJsonRecord(request);
  if (!body) return apiError("invalid_json", 400);

  const period = String(body.period ?? "");
  const reasonRaw = typeof body.reason === "string" ? body.reason.trim() : "";
  const reason = reasonRaw ? reasonRaw.slice(0, 500) : null;

  if (!PERIODS.has(period)) return apiError("invalid_period", 400);

  const { data, error } = await service.supabase.rpc("service_request_self_exclusion", {
    p_actor_id: auth.user.id,
    p_period: period,
    p_reason: reason,
  });

  if (error) {
    return apiError(safeRpcError(error, "self_exclusion_failed"), 400);
  }

  return NextResponse.json({ data });
}
