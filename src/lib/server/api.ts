import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/server/supabase-admin";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const CURRENCIES = new Set(["gold", "sweeps", "diamonds"]);
const SAFE_RPC_ERROR_RE = /^[a-z0-9_]+$/i;

export function apiError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export async function readJsonRecord(request: Request) {
  try {
    const body: unknown = await request.json();
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
}

export function readPositiveNumber(value: unknown, max = 1_000_000) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > max) return null;
  return number;
}

export function readInt(value: unknown, min: number, max: number) {
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

export function safeRpcError(error: unknown, fallback: string) {
  const message = typeof error === "object" && error && "message" in error ? String(error.message) : "";
  return SAFE_RPC_ERROR_RE.test(message) ? message : fallback;
}

export async function requireAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: apiError("unauthorized", 401) } as const;
  }

  return { user } as const;
}

export function requireServiceClient() {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return { error: apiError("server_not_configured", 500) } as const;
  }

  return { supabase } as const;
}
