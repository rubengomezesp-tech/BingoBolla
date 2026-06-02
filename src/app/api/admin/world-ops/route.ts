import { NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/server/admin";
import { apiError } from "@/lib/server/api";
import { loadWorldOps, parseWorldOpsWindow } from "@/lib/server/world-ops";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await requireAdminContext();
  if (!ctx.ok) return ctx.response;

  const { searchParams } = new URL(request.url);
  const window = parseWorldOpsWindow(searchParams.get("window"));

  try {
    const ops = await loadWorldOps(ctx.supabase, { window });
    return NextResponse.json(ops);
  } catch (error) {
    console.error("[admin.world-ops]", error);
    return apiError("world_ops_load_failed", 500);
  }
}
