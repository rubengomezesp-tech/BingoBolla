import { NextResponse } from "next/server";
import { apiError, requireAuthenticatedUser, requireServiceClient } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const { data, error } = await service.supabase.rpc("service_daily_bonus_status", {
    p_actor_id: auth.user.id,
  });

  if (error) {
    console.error("[rewards.daily.status]", error);
    return apiError("daily_status_failed", 500);
  }

  return NextResponse.json({ data });
}

export async function POST() {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const { data, error } = await service.supabase.rpc("service_claim_daily_bonus", {
    p_actor_id: auth.user.id,
  });

  if (error) {
    console.error("[rewards.daily.claim]", error);
    return apiError("daily_claim_failed", 500);
  }

  return NextResponse.json({ data });
}
