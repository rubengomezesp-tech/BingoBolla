import { NextResponse } from "next/server";
import { apiError, requireAuthenticatedUser, requireServiceClient } from "@/lib/server/api";

export const dynamic = "force-dynamic";

const WORLD_ID_RE = /^[a-z0-9_-]{1,80}$/i;
const ADMIN_EMAIL = "rubengomezesp@gmail.com";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const worldId = searchParams.get("worldId") ?? searchParams.get("world_id") ?? "miami_nights";

  if (!WORLD_ID_RE.test(worldId)) {
    return apiError("invalid_world_id", 400);
  }

  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const [map, assets, xp, jackpots, profile] = await Promise.all([
    service.supabase.rpc("service_get_world_map", {
      p_actor_id: auth.user.id,
      p_world_id: worldId,
    }),
    service.supabase.rpc("service_get_world_assets", { p_actor_id: auth.user.id }),
    service.supabase.rpc("service_get_player_xp", {
      p_actor_id: auth.user.id,
      p_player_id: auth.user.id,
    }),
    service.supabase.rpc("service_room_jackpots", { p_actor_id: auth.user.id }),
    service.supabase
      .from("profiles")
      .select("gold_coins,sweeps_coins,diamonds,username,display_name")
      .eq("id", auth.user.id)
      .maybeSingle(),
  ]);

  if (map.error) return apiError("world_map_load_failed", 500);
  if (assets.error) return apiError("world_assets_load_failed", 500);
  if (xp.error) return apiError("player_xp_load_failed", 500);
  if (jackpots.error) return apiError("jackpots_load_failed", 500);
  if (profile.error) return apiError("profile_load_failed", 500);

  return NextResponse.json({
    map: map.data ?? [],
    assets: assets.data ?? {},
    xp: xp.data ?? [],
    jackpots: jackpots.data ?? [],
    profile: profile.data ?? null,
    is_admin: auth.user.email === ADMIN_EMAIL,
  });
}
