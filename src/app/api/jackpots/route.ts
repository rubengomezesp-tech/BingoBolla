import { NextResponse } from "next/server";
import { apiError, requireAuthenticatedUser, requireServiceClient } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const { data, error } = await service.supabase.rpc("service_room_jackpots", {
    p_actor_id: auth.user.id,
  });

  if (error) return apiError("jackpots_load_failed", 500);

  return NextResponse.json({ data: data ?? [] });
}
