import { apiError, isRecord, safeRpcError } from "@/lib/server/api";

const ERROR_STATUS: Record<string, number> = {
  account_banned: 403,
  daily_limit_reached: 429,
  energy_full: 409,
  insufficient_gold: 409,
  invalid_building: 400,
  max_level: 409,
  no_energy: 409,
  not_authenticated: 401,
  not_enough_tickets: 409,
  profile_not_found: 404,
  self_excluded: 403,
};

export const BOLLA_MASTER_BUILDINGS = new Set(["hotel_neon", "muelle_dorado", "sala_vip"]);
export const BOLLA_MASTER_NONCE_RE = /^[a-z0-9_-]{8,80}$/i;

export function bollaMasterDataError(data: unknown) {
  if (!isRecord(data) || typeof data.error !== "string") return null;
  return apiError(data.error, ERROR_STATUS[data.error] ?? 400);
}

export function bollaMasterRpcError(error: unknown, fallback: string) {
  return apiError(safeRpcError(error, fallback), 400);
}
