import { NextResponse } from "next/server";
import {
  apiError,
  isRecord,
  readInt,
  readJsonRecord,
} from "@/lib/server/api";
import { requireAdminContext } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

const CODE_RE = /^[A-Z0-9_-]{3,40}$/;

function readMoneyAmount(value: unknown, integer = false) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number) || Math.abs(number) > 1_000_000_000) return null;
  return integer ? Math.trunc(number) : number;
}

function rpcStatus(data: unknown) {
  if (!isRecord(data) || typeof data.error !== "string") return 200;
  return data.error === "forbidden" ? 403 : 400;
}

export async function GET() {
  const ctx = await requireAdminContext();
  if (!ctx.ok) return ctx.response;

  const [{ data: stats, error: statsError }, { data: codes, error: codesError }] = await Promise.all([
    ctx.supabase.rpc("service_admin_stats", { p_actor_id: ctx.user.id }),
    ctx.supabase.rpc("service_admin_list_codes", { p_actor_id: ctx.user.id }),
  ]);

  if (statsError || codesError) {
    console.error("[admin.get]", statsError ?? codesError);
    return apiError("admin_request_failed", 500);
  }

  if (isRecord(stats) && stats.error) return apiError(String(stats.error), rpcStatus(stats));
  if (isRecord(codes) && codes.error) return apiError(String(codes.error), rpcStatus(codes));

  return NextResponse.json({ stats, codes: codes ?? [] });
}

export async function POST(request: Request) {
  const ctx = await requireAdminContext();
  if (!ctx.ok) return ctx.response;

  const body = await readJsonRecord(request);
  if (!body) return apiError("invalid_json", 400);

  if (body.action === "grant_coins") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const gold = readMoneyAmount(body.gold, true);
    const sweeps = readMoneyAmount(body.sweeps);
    const diamonds = readMoneyAmount(body.diamonds);

    if (!email || !email.includes("@") || gold === null || sweeps === null || diamonds === null) {
      return apiError("invalid_grant", 400);
    }

    const { data, error } = await ctx.supabase.rpc("service_admin_grant_coins", {
      p_actor_id: ctx.user.id,
      p_email: email,
      p_gold: gold,
      p_sweeps: sweeps,
      p_diamonds: diamonds,
    });

    if (error) {
      console.error("[admin.grant_coins]", error);
      return apiError("grant_failed", 500);
    }
    if (isRecord(data) && data.error) return apiError(String(data.error), rpcStatus(data));

    return NextResponse.json(data);
  }

  if (body.action === "create_code") {
    const code = String(body.code ?? "").trim().toUpperCase();
    const kind = body.kind === "discount" ? "discount" : body.kind === "coins" ? "coins" : null;
    const gold = readMoneyAmount(body.gold, true);
    const sweeps = readMoneyAmount(body.sweeps);
    const diamonds = readMoneyAmount(body.diamonds);
    const discountPct = readInt(body.discount_pct, 0, 100);
    const maxUses = readInt(body.max_uses, 1, 1_000_000);
    const expiresDays = readInt(body.expires_days, 0, 3650);

    if (
      !CODE_RE.test(code) ||
      !kind ||
      gold === null ||
      sweeps === null ||
      diamonds === null ||
      discountPct === null ||
      maxUses === null ||
      expiresDays === null
    ) {
      return apiError("invalid_code", 400);
    }

    const { data, error } = await ctx.supabase.rpc("service_admin_create_code", {
      p_actor_id: ctx.user.id,
      p_code: code,
      p_kind: kind,
      p_gold: gold,
      p_sweeps: sweeps,
      p_diamonds: diamonds,
      p_discount_pct: discountPct,
      p_max_uses: maxUses,
      p_expires_days: expiresDays,
    });

    if (error) {
      console.error("[admin.create_code]", error);
      return apiError("code_create_failed", 500);
    }
    if (isRecord(data) && data.error) return apiError(String(data.error), rpcStatus(data));

    return NextResponse.json(data);
  }

  return apiError("unknown_action", 400);
}
