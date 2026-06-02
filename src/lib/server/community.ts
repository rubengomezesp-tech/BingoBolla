import { createSupabaseServiceClient } from "@/lib/server/supabase-admin";

export type CommunityReferral = {
  username: string;
  joinedAt: string;
  status: "registered" | "onboarded" | "qualified" | "blocked";
  rewardStatus: "pending" | "claimed" | "blocked";
};

export type CommunityReferralStats = {
  referralCode: string;
  totalRegistered: number;
  onboarded: number;
  pendingRewards: number;
  nextGoal: number;
  recentReferrals: CommunityReferral[];
  persisted: boolean;
  reason?: "server_not_configured" | "migration_pending" | "load_failed";
};

type ReferralStatsPayload = {
  referral_code?: unknown;
  stats?: unknown;
  recent_referrals?: unknown;
};

const REFERRAL_CODE_RE = /^[a-z0-9_]{3,48}$/;
const REFERRAL_STATUS = new Set(["registered", "onboarded", "qualified", "blocked"]);
const REWARD_STATUS = new Set(["pending", "claimed", "blocked"]);

export function normalizeCommunityReferralCode(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  if (REFERRAL_CODE_RE.test(normalized)) return normalized;

  const fallbackSuffix = fallback.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 8) || "player";
  return `bb_${fallbackSuffix}`.slice(0, 48);
}

export function buildCommunityReferralUrl(referralCode: string) {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || vercelUrl || "https://bingobolla.com";
  return `${siteUrl.replace(/\/+$/, "")}/signup?ref=${encodeURIComponent(referralCode)}`;
}

function emptyStats(referralCode: string, reason?: CommunityReferralStats["reason"]): CommunityReferralStats {
  return {
    referralCode,
    totalRegistered: 0,
    onboarded: 0,
    pendingRewards: 0,
    nextGoal: 1,
    recentReferrals: [],
    persisted: false,
    reason,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function numberField(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.trunc(number) : fallback;
}

function stringField(value: unknown, fallback: string) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function readRecentReferrals(value: unknown): CommunityReferral[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 8).flatMap((row) => {
    if (!isRecord(row)) return [];

    const status = String(row.status ?? "registered");
    const rewardStatus = String(row.reward_status ?? "pending");

    return [
      {
        username: stringField(row.username, "Jugador"),
        joinedAt: stringField(row.joined_at, ""),
        status: REFERRAL_STATUS.has(status) ? (status as CommunityReferral["status"]) : "registered",
        rewardStatus: REWARD_STATUS.has(rewardStatus)
          ? (rewardStatus as CommunityReferral["rewardStatus"])
          : "pending",
      },
    ];
  });
}

function migrationPending(error: unknown) {
  if (!isRecord(error)) return false;
  const code = String(error.code ?? "");
  const message = String(error.message ?? "");
  return code === "42883" || code === "42703" || message.includes("service_get_community_referral_stats");
}

export async function loadCommunityReferralStats(
  userId: string,
  fallbackReferralCode: string
): Promise<CommunityReferralStats> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return emptyStats(fallbackReferralCode, "server_not_configured");

  const { data, error } = await supabase.rpc("service_get_community_referral_stats", {
    p_actor_id: userId,
  });

  if (error) {
    if (migrationPending(error)) return emptyStats(fallbackReferralCode, "migration_pending");
    console.error("[community.referrals]", error);
    return emptyStats(fallbackReferralCode, "load_failed");
  }

  if (!isRecord(data)) return emptyStats(fallbackReferralCode, "load_failed");

  const payload = data as ReferralStatsPayload;
  const stats = isRecord(payload.stats) ? payload.stats : {};
  const referralCode = normalizeCommunityReferralCode(String(payload.referral_code ?? ""), fallbackReferralCode);

  return {
    referralCode,
    totalRegistered: numberField(stats.total_registered),
    onboarded: numberField(stats.onboarded),
    pendingRewards: numberField(stats.pending_rewards),
    nextGoal: Math.max(1, numberField(stats.next_goal, 1)),
    recentReferrals: readRecentReferrals(payload.recent_referrals),
    persisted: true,
  };
}
