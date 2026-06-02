import { NextResponse } from "next/server";
import { requireAdminContext } from "@/lib/server/admin";
import { apiError, readJsonRecord } from "@/lib/server/api";
import { loadWorldOps, parseWorldOpsWindow } from "@/lib/server/world-ops";
import {
  applyWorldNodeTuning,
  loadWorldTuningHistory,
  previewWorldNodeTuning,
} from "@/lib/server/world-tuning";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireAdminContext();
  if (!ctx.ok) return ctx.response;

  try {
    const history = await loadWorldTuningHistory(ctx.supabase);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("[admin.world-tuning.history]", error);
    return apiError("world_tuning_history_failed", 500);
  }
}

export async function POST(request: Request) {
  const ctx = await requireAdminContext();
  if (!ctx.ok) return ctx.response;

  const body = await readJsonRecord(request);
  if (!body) return apiError("invalid_json", 400);

  try {
    if (body.action === "preview") {
      const result = await previewWorldNodeTuning(ctx.supabase, body);
      if (!result.ok) return result.response;
      return NextResponse.json({ impact: result.impact });
    }

    if (body.action === "apply") {
      const url = new URL(request.url);
      const window = parseWorldOpsWindow(url.searchParams.get("window"));
      const result = await applyWorldNodeTuning({
        body,
        loadOps: () => loadWorldOps(ctx.supabase, { window }),
        supabase: ctx.supabase,
        userId: ctx.user.id,
        window,
      });
      if (!result.ok) return result.response;
      return NextResponse.json({
        audit: result.audit,
        history: result.history,
        impact: result.impact,
        ops: result.ops,
      });
    }

    return apiError("unknown_action", 400);
  } catch (error) {
    console.error("[admin.world-tuning]", error);
    return apiError("world_tuning_failed", 500);
  }
}
