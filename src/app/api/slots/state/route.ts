import { NextResponse } from "next/server";
import { apiError, requireAuthenticatedUser, requireServiceClient } from "@/lib/server/api";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]{1,80}$/i;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "";

  if (!SLUG_RE.test(slug)) {
    return apiError("invalid_slot_slug", 400);
  }

  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const { data, error } = await service.supabase.rpc("service_get_slot_state", {
    p_actor_id: auth.user.id,
    p_slug: slug,
  });

  if (error) return apiError("slot_state_failed", 500);

  return NextResponse.json(data);
}
