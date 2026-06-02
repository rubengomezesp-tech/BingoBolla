import { NextResponse } from "next/server";
import { apiError, readJsonRecord, requireAuthenticatedUser, requireServiceClient } from "@/lib/server/api";
import {
  BOLLA_MASTER_BUILDINGS,
  bollaMasterDataError,
  bollaMasterRpcError,
} from "@/lib/server/bolla-master";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const body = await readJsonRecord(request);
  if (!body) return apiError("invalid_json", 400);

  const buildingKey = String(body.building_key ?? "");
  if (!BOLLA_MASTER_BUILDINGS.has(buildingKey)) return apiError("invalid_building", 400);

  const { data, error } = await service.supabase.rpc("service_upgrade_bolla_master_building", {
    p_actor_id: auth.user.id,
    p_building_key: buildingKey,
  });

  if (error) {
    console.error("[bolla-master.upgrade]", error);
    return bollaMasterRpcError(error, "bolla_master_upgrade_failed");
  }

  const dataError = bollaMasterDataError(data);
  if (dataError) return dataError;

  return NextResponse.json(data);
}
