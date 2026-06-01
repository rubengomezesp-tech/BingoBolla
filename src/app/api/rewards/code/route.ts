import { NextResponse } from "next/server";
import {
  apiError,
  readJsonRecord,
  requireAuthenticatedUser,
  requireServiceClient,
} from "@/lib/server/api";

export const dynamic = "force-dynamic";

const CODE_RE = /^[A-Z0-9_-]{2,64}$/i;

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const body = await readJsonRecord(request);
  if (!body) return apiError("invalid_json", 400);

  const code = String(body.code ?? "").trim();
  if (!CODE_RE.test(code)) return apiError("invalid_code", 400);

  const { data, error } = await service.supabase.rpc("service_redeem_code", {
    p_actor_id: auth.user.id,
    p_code: code,
  });

  if (error) {
    console.error("[rewards.code.redeem]", error);
    return apiError("redeem_failed", 500);
  }

  return NextResponse.json({ data });
}
