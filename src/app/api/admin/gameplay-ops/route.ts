import { NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/server/admin";
import { apiError } from "@/lib/server/api";
import { loadGameplayOps, parseGameplayOpsWindow } from "@/lib/server/gameplay-ops";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ctx = await requireAdminContext();
  if (!ctx.ok) return ctx.response;

  const { searchParams } = new URL(request.url);
  const window = parseGameplayOpsWindow(searchParams.get("window"));

  try {
    const ops = await loadGameplayOps(ctx.supabase, { window });
    return NextResponse.json(ops);
  } catch (error) {
    console.error("[admin.gameplay-ops]", error);
    return apiError("gameplay_ops_load_failed", 500);
  }
}
