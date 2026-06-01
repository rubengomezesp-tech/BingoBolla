import { NextResponse } from "next/server";
import { apiError, requireAuthenticatedUser, requireServiceClient } from "@/lib/server/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const [progress, missions, playerXp] = await Promise.all([
    service.supabase.rpc("service_my_progress", { p_actor_id: auth.user.id }),
    service.supabase.rpc("service_my_missions", { p_actor_id: auth.user.id }),
    service.supabase.rpc("service_get_player_xp", {
      p_actor_id: auth.user.id,
      p_player_id: auth.user.id,
    }),
  ]);

  if (progress.error) return apiError("progress_load_failed", 500);
  if (missions.error) return apiError("missions_load_failed", 500);
  if (playerXp.error) return apiError("player_xp_load_failed", 500);

  return NextResponse.json({
    progress: progress.data,
    missions: missions.data ?? [],
    player_xp: playerXp.data ?? [],
  });
}
