import { NextResponse } from "next/server";
import {
  UUID_RE,
  apiError,
  readJsonRecord,
  requireAuthenticatedUser,
  requireServiceClient,
} from "@/lib/server/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const body = await readJsonRecord(request);
  if (!body) return apiError("invalid_json", 400);

  const gameId = String(body.game_id ?? "");
  if (!UUID_RE.test(gameId)) return apiError("invalid_game", 400);

  const { data, error } = await service.supabase.rpc("service_claim_winner_info", {
    p_actor_id: auth.user.id,
    p_game_id: gameId,
  });

  if (error) {
    console.error("[room.winner_info]", error);
    return apiError("winner_info_failed", 500);
  }

  return NextResponse.json({ data });
}
