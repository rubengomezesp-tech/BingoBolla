import { NextResponse } from "next/server";
import {
  apiError,
  isRecord,
  readJsonRecord,
  requireAuthenticatedUser,
  requireServiceClient,
  safeRpcError,
} from "@/lib/server/api";

export const dynamic = "force-dynamic";

const LIMIT_KEYS = [
  "daily_deposit_limit",
  "weekly_deposit_limit",
  "monthly_deposit_limit",
  "daily_wager_limit",
  "weekly_wager_limit",
  "daily_loss_limit",
  "weekly_loss_limit",
  "session_minutes_limit",
  "reality_check_interval_minutes",
] as const;

const INTEGER_KEYS = new Set(["session_minutes_limit", "reality_check_interval_minutes"]);

function sanitizeLimits(value: unknown) {
  if (!isRecord(value)) return null;

  const limits: Record<string, number> = {};
  for (const key of LIMIT_KEYS) {
    const raw = value[key];
    if (raw === undefined || raw === null || raw === "") continue;

    const number = Number(raw);
    if (!Number.isFinite(number) || number < 0 || number > 1_000_000) return null;

    limits[key] = INTEGER_KEYS.has(key) ? Math.trunc(number) : number;
  }

  if (
    limits.reality_check_interval_minutes !== undefined &&
    (limits.reality_check_interval_minutes < 5 || limits.reality_check_interval_minutes > 240)
  ) {
    return null;
  }

  if (
    limits.session_minutes_limit !== undefined &&
    limits.session_minutes_limit !== 0 &&
    (limits.session_minutes_limit < 5 || limits.session_minutes_limit > 1440)
  ) {
    return null;
  }

  return limits;
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const body = await readJsonRecord(request);
  if (!body) return apiError("invalid_json", 400);

  const limits = sanitizeLimits(body.limits);
  if (!limits) return apiError("invalid_limits", 400);

  const { data, error } = await service.supabase.rpc("service_upsert_rg_limits", {
    p_actor_id: auth.user.id,
    p_limits: limits,
  });

  if (error) {
    return apiError(safeRpcError(error, "limits_update_failed"), 400);
  }

  return NextResponse.json({ data });
}
