import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const WORLD_ID = "miami_nights";
export const RUN_TTL_MS = 20 * 60 * 1000;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type AllowedGame = "ballmatch" | "neural_cascade";

export const ALLOWED_GAMES = new Set<AllowedGame>(["ballmatch", "neural_cascade"]);
export const RUN_TOKEN_RE = /^[a-f0-9]{64}$/i;

export function clampInt(value: unknown, min: number, max: number) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function readJsonInt(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function readTrustedInt(value: unknown, min: number, max: number) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export function isAllowedGame(game: string): game is AllowedGame {
  return ALLOWED_GAMES.has(game as AllowedGame);
}

export function scoreLimitForGame(game: AllowedGame) {
  return game === "neural_cascade" ? 100_000 : 5_000_000;
}

export type GameResultValidation =
  | {
      ok: true;
      level: number;
      score: number;
      stars: number;
    }
  | {
      ok: false;
      error: string;
      status: number;
    };

export function validateWorldGameResult({
  body,
  game,
  node,
}: {
  body: Record<string, unknown>;
  game: AllowedGame;
  node: Record<string, unknown>;
}): GameResultValidation {
  const maxStars = readTrustedInt(node.max_stars, 1, 3) ?? 3;
  const stars = readJsonInt(body.stars);
  if (stars === null || stars < 1 || stars > maxStars) {
    return { ok: false, error: "invalid_stars", status: 400 };
  }

  const score = readJsonInt(body.score);
  if (score === null || score < 1 || score > scoreLimitForGame(game)) {
    return { ok: false, error: "invalid_score", status: 400 };
  }

  const nodeIndex = readTrustedInt(node.node_index, 1, 500);
  if (nodeIndex === null) {
    return { ok: false, error: "invalid_world_node", status: 500 };
  }

  const level = readJsonInt(body.level);
  if (level === null || level < 1 || level > 500) {
    return { ok: false, error: "invalid_level", status: 400 };
  }

  if (level !== nodeIndex) {
    return { ok: false, error: "level_node_mismatch", status: 409 };
  }

  return { ok: true, level, score, stars };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function explicitGameForTarget(targetRef: unknown): string | null {
  const ref = String(targetRef ?? "").toLowerCase();
  if (!ref) return null;
  if (ref.includes("neural")) return "neural_cascade";
  if (ref.includes("ball") || ref.includes("bolla") || ref.includes("numbers")) return "ballmatch";
  return null;
}

export function xpForNodeCompletion(
  node: Record<string, unknown>,
  stars: number,
  firstCompletion: boolean
) {
  if (!firstCompletion || stars <= 0) return 0;

  const maxStars = clampInt(node.max_stars, 1, 3);
  const baseXp = clampInt(node.reward_xp, 0, 5000);
  const scaledXp = Math.ceil(baseXp * (stars / maxStars));

  return Math.max(0, Math.min(5000, scaledXp));
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createSupabaseAdmin(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export function shouldRequireGameRun({ adminAvailable = false }: { adminAvailable?: boolean } = {}) {
  if (process.env.WORLD_GAME_RUNS_REQUIRED === "false") return false;

  return (
    process.env.WORLD_GAME_RUNS_REQUIRED === "true" ||
    process.env.NODE_ENV === "production" ||
    adminAvailable
  );
}

export function isMissingGameRunsTableError(error: unknown) {
  if (!isRecord(error)) return false;

  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();

  return code === "42P01" || message.includes("world_game_runs");
}

export function safeHeader(value: string | null, maxLength = 240) {
  if (!value) return null;
  return value.slice(0, maxLength);
}

export function generateRunToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashRunToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function constantTimeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let diff = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);

  for (let i = 0; i < length; i += 1) {
    diff |= (leftBytes[i] ?? 0) ^ (rightBytes[i] ?? 0);
  }

  return diff === 0;
}
