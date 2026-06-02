import { NextResponse } from "next/server";
import { apiError, requireAuthenticatedUser, requireServiceClient } from "@/lib/server/api";
import { bollaMasterDataError } from "@/lib/server/bolla-master";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const { data, error } = await service.supabase.rpc("service_get_bolla_master_state", {
    p_actor_id: auth.user.id,
  });

  if (error) {
    console.error("[bolla-master.state]", error);
    return apiError("bolla_master_state_failed", 500);
  }

  const dataError = bollaMasterDataError(data);
  if (dataError) return dataError;

  return NextResponse.json(data);
}
