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

function readAttempt(body: Record<string, unknown>) {
  return isRecord(body.attempt) ? body.attempt : null;
}

function validationError(error: string, status = 400): GameResultValidation {
  return { ok: false, error, status };
}

function expectedBallmatchMoves(level: number) {
  return 18 + Math.floor(level * 0.6);
}

function expectedBallmatchGoal(level: number) {
  return 20 + Math.round(level * 3.6);
}

function maxBallmatchStars({
  movesLeft,
  movesStart,
  goalLeft,
  bingoLines,
}: {
  movesLeft: number;
  movesStart: number;
  goalLeft: number;
  bingoLines: number;
}) {
  const goalDone = goalLeft <= 0;
  const bingoDone = bingoLines >= 5;
  if (!goalDone && !bingoDone) return 0;

  const efficiencyRatio = movesStart > 0 ? movesLeft / movesStart : 0;
  if (goalDone && (bingoLines >= 3 || efficiencyRatio >= 0.3)) return 3;
  if (bingoDone && movesLeft > 0) return 3;
  if (goalDone && bingoLines >= 2) return 2;
  if (bingoDone) return 2;
  return 1;
}

function expectedNeuralBossLevel(level: number) {
  if (level <= 5) return 5;
  if (level <= 10) return 10;
  if (level <= 15) return 15;
  return 20;
}

function maxNeuralStars(relaysUsed: number, relaysMax: number) {
  const optimal = Math.max(1, relaysMax - 2);
  if (relaysUsed <= optimal) return 3;
  if (relaysUsed <= optimal + 2) return 2;
  return 1;
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

  const attempt = readAttempt(body);
  if (!attempt) {
    return validationError("invalid_attempt");
  }

  const attemptVersion = readTrustedInt(attempt.version, 2, 2);
  if (attemptVersion !== 2) {
    return validationError("invalid_attempt_version");
  }

  if (attempt.game !== game) {
    return validationError("game_attempt_mismatch", 409);
  }

  const attemptLevel = readJsonInt(attempt.level);
  if (attemptLevel === null || attemptLevel !== level) {
    return validationError("level_attempt_mismatch", 409);
  }

  const attemptStars = readTrustedInt(attempt.stars, 1, maxStars);
  if (attemptStars === null || attemptStars !== stars) {
    return validationError("stars_attempt_mismatch", 409);
  }

  const attemptScore = readJsonInt(attempt.score);
  if (attemptScore === null || attemptScore !== score) {
    return validationError("score_attempt_mismatch", 409);
  }

  if (game === "ballmatch") {
    const movesStart = readTrustedInt(attempt.moves_start, 1, 80);
    const movesLeft = readTrustedInt(attempt.moves_left, 0, 80);
    const movesUsed = readTrustedInt(attempt.moves_used, 0, 80);
    const goalTotal = readTrustedInt(attempt.goal_total, 1, 300);
    const goalLeft = readTrustedInt(attempt.goal_left, 0, 300);
    const bingoLines = readTrustedInt(attempt.bingo_lines, 0, 12);
    const combos = readTrustedInt(attempt.combos, 0, 500);
    const boostersUsed = readTrustedInt(attempt.boosters_used, 0, 6);
    const feverActivations = readTrustedInt(attempt.fever_activations, 0, 25);

    if (
      movesStart === null ||
      movesLeft === null ||
      movesUsed === null ||
      goalTotal === null ||
      goalLeft === null ||
      bingoLines === null ||
      combos === null ||
      boostersUsed === null ||
      feverActivations === null
    ) {
      return validationError("invalid_ballmatch_attempt");
    }

    if (movesStart !== expectedBallmatchMoves(level) || goalTotal !== expectedBallmatchGoal(level)) {
      return validationError("ballmatch_level_config_mismatch", 409);
    }
    if (goalLeft > goalTotal || movesUsed !== movesStart - movesLeft) {
      return validationError("ballmatch_attempt_mismatch", 409);
    }
    if (movesUsed + boostersUsed < 1) {
      return validationError("ballmatch_no_action");
    }

    const maxStarsForAttempt = maxBallmatchStars({ movesLeft, movesStart, goalLeft, bingoLines });
    if (maxStarsForAttempt < 1) {
      return validationError("ballmatch_goal_incomplete", 409);
    }
    if (stars > maxStarsForAttempt) {
      return validationError("ballmatch_stars_exceed_attempt", 409);
    }
  }

  if (game === "neural_cascade") {
    const bossLevel = readTrustedInt(attempt.boss_level, 1, 500);
    const puzzleIndex = readTrustedInt(attempt.puzzle_index, 0, 4);
    const puzzlesCompleted = readTrustedInt(attempt.puzzles_completed, 1, 5);
    const relaysMax = readTrustedInt(attempt.relays_max, 1, 40);
    const relaysLeft = readTrustedInt(attempt.relays_left, 0, 40);
    const relaysUsed = readTrustedInt(attempt.relays_used, 0, 40);
    const relaysSteiner = readTrustedInt(attempt.relays_steiner, 0, 20);
    const targetsTotal = readTrustedInt(attempt.targets_total, 1, 8);
    const targetsLeft = readTrustedInt(attempt.targets_left, 0, 8);
    const targetsReached = readTrustedInt(attempt.targets_reached, 0, 8);
    const bossComplete = attempt.boss_complete === true;

    if (
      bossLevel === null ||
      puzzleIndex === null ||
      puzzlesCompleted === null ||
      relaysMax === null ||
      relaysLeft === null ||
      relaysUsed === null ||
      relaysSteiner === null ||
      targetsTotal === null ||
      targetsLeft === null ||
      targetsReached === null
    ) {
      return validationError("invalid_neural_attempt");
    }

    if (bossLevel !== expectedNeuralBossLevel(level)) {
      return validationError("neural_boss_level_mismatch", 409);
    }
    if (!bossComplete || puzzleIndex !== 4 || puzzlesCompleted !== 5) {
      return validationError("neural_boss_incomplete", 409);
    }
    if (relaysUsed !== relaysMax - relaysLeft || targetsLeft !== 0 || targetsReached !== targetsTotal) {
      return validationError("neural_attempt_mismatch", 409);
    }
    if (relaysSteiner > relaysUsed) {
      return validationError("neural_steiner_mismatch", 409);
    }
    if (stars > maxNeuralStars(relaysUsed, relaysMax)) {
      return validationError("neural_stars_exceed_attempt", 409);
    }
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
