export type WorldOpsWindow = "24h" | "7d" | "30d";

export type WorldOpsPayload = {
  generated_at: string;
  window: WorldOpsWindow;
  limited: boolean;
  health: {
    audit_coverage_pct: number;
    avg_elapsed_ms: number;
    avg_risk: number;
    cancelled_runs: number;
    completed_runs: number;
    completion_rate_pct: number;
    critical_risk_runs: number;
    expired_runs: number;
    gold_awarded: number;
    high_risk_runs: number;
    live_runs: number;
    reward_claims: number;
    risk_posture: "normal" | "watch" | "hot";
    run_volume: number;
    stale_runs: number;
    star_delta: number;
    started_runs: number;
    xp_awarded: number;
  };
  game_breakdown: Array<{
    avg_risk: number;
    completed: number;
    completion_rate_pct: number;
    game: string;
    high_risk: number;
    runs: number;
  }>;
  flag_breakdown: Array<{
    count: number;
    flag: string;
  }>;
  recent_risk: Array<{
    attempt_hash: string | null;
    client_elapsed_ms: number | null;
    completed_at: string | null;
    flags: string[];
    game: string;
    id: string;
    player_id: string;
    score: number;
    stars: number;
    validation_risk: number;
  }>;
  trend: Array<{
    completed: number;
    high_risk: number;
    label: string;
    started: number;
    xp_awarded: number;
  }>;
};
