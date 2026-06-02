import { NextResponse } from "next/server";
import { apiError, readJsonRecord, requireAuthenticatedUser, requireServiceClient } from "@/lib/server/api";
import {
  BOLLA_MASTER_NONCE_RE,
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

  const nonce = String(body.nonce ?? "");
  if (!BOLLA_MASTER_NONCE_RE.test(nonce)) return apiError("invalid_nonce", 400);

  const { data, error } = await service.supabase.rpc("service_spin_bolla_master", {
    p_actor_id: auth.user.id,
    p_client_nonce: nonce,
  });

  if (error) {
    console.error("[bolla-master.spin]", error);
    return bollaMasterRpcError(error, "bolla_master_spin_failed");
  }

  const dataError = bollaMasterDataError(data);
  if (dataError) return dataError;

  return NextResponse.json(data);
}
