import { NextResponse } from "next/server";
import { requireAuthenticatedUser, requireServiceClient } from "@/lib/server/api";
import { bollaMasterDataError, bollaMasterRpcError } from "@/lib/server/bolla-master";

export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const { data, error } = await service.supabase.rpc("service_refill_bolla_master_energy", {
    p_actor_id: auth.user.id,
  });

  if (error) {
    console.error("[bolla-master.refill]", error);
    return bollaMasterRpcError(error, "bolla_master_refill_failed");
  }

  const dataError = bollaMasterDataError(data);
  if (dataError) return dataError;

  return NextResponse.json(data);
}
