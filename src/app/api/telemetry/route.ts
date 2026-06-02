import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/server/supabase-admin";
import {
  apiError,
  isRecord,
  readJsonRecord,
  requireAuthenticatedUser,
} from "@/lib/server/api";
import { GAMEPLAY_EVENT_NAMES, GAMEPLAY_SURFACES } from "@/lib/telemetry/events";

export const dynamic = "force-dynamic";

const EVENT_SET = new Set<string>(GAMEPLAY_EVENT_NAMES);
const SURFACE_SET = new Set<string>(GAMEPLAY_SURFACES);
const CLIENT_EVENT_ID_RE = /^[a-zA-Z0-9_-]{8,80}$/;
const BLOCKED_KEY_RE = /(authorization|card|email|iban|password|payment|phone|secret|token)/i;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function safeText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[^\x20-\x7E\u00C0-\u017F]/g, "").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function safePath(value: unknown) {
  const text = safeText(value, 180);
  if (!text || !text.startsWith("/")) return null;
  return text.split("?")[0].slice(0, 180);
}

function sanitizeJson(value: unknown, depth = 0): JsonValue | undefined {
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return value.slice(0, 160);

  if (Array.isArray(value)) {
    if (depth >= 3) return undefined;
    return value
      .slice(0, 20)
      .map((item) => sanitizeJson(item, depth + 1))
      .filter((item): item is JsonValue => item !== undefined);
  }

  if (!isRecord(value) || depth >= 3) return undefined;

  const output: Record<string, JsonValue> = {};
  for (const [key, raw] of Object.entries(value).slice(0, 24)) {
    const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 48);
    if (!safeKey || BLOCKED_KEY_RE.test(safeKey)) continue;

    const next = sanitizeJson(raw, depth + 1);
    if (next !== undefined) output[safeKey] = next;
  }

  return output;
}

function sanitizeMetadata(value: unknown) {
  const json = sanitizeJson(value);
  return isRecord(json) ? json : {};
}

function sanitizeViewport(value: unknown) {
  if (!isRecord(value)) return {};
  const width = Math.trunc(Number(value.width));
  const height = Math.trunc(Number(value.height));

  return {
    ...(Number.isFinite(width) && width > 0 && width <= 10000 ? { width } : {}),
    ...(Number.isFinite(height) && height > 0 && height <= 10000 ? { height } : {}),
  };
}

function safeUserAgent(request: Request) {
  return safeText(request.headers.get("user-agent"), 180);
}

function tableMissing(error: unknown) {
  return isRecord(error) && (error.code === "42P01" || String(error.message ?? "").includes("gameplay_events"));
}

function duplicateEvent(error: unknown) {
  return isRecord(error) && error.code === "23505";
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const body = await readJsonRecord(request);
  if (!body) return apiError("invalid_json", 400);

  const eventName = safeText(body.event_name, 80);
  const surface = safeText(body.surface, 40);
  const clientEventId = safeText(body.client_event_id, 80);

  if (!eventName || !EVENT_SET.has(eventName) || !surface || !SURFACE_SET.has(surface)) {
    return apiError("invalid_telemetry_event", 400);
  }

  if (clientEventId && !CLIENT_EVENT_ID_RE.test(clientEventId)) {
    return apiError("invalid_client_event_id", 400);
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, persisted: false, reason: "server_not_configured" }, { status: 202 });
  }

  const { error } = await supabase.from("gameplay_events").insert({
    client_event_id: clientEventId,
    event_name: eventName,
    metadata: sanitizeMetadata(body.metadata),
    path: safePath(body.path),
    player_id: auth.user.id,
    surface,
    user_agent: safeUserAgent(request),
    viewport: sanitizeViewport(body.viewport),
  });

  if (duplicateEvent(error)) {
    return NextResponse.json({ duplicate: true, ok: true, persisted: true });
  }

  if (tableMissing(error)) {
    return NextResponse.json({ ok: true, persisted: false, reason: "table_missing" }, { status: 202 });
  }

  if (error) {
    console.error("[telemetry]", error);
    return apiError("telemetry_failed", 500);
  }

  return NextResponse.json({ ok: true, persisted: true });
}
