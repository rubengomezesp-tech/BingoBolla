export type WorldOpsWindow = "24h" | "7d" | "30d";

export type WorldOpsPayload = {
  generated_at: string;
  window: WorldOpsWindow;
  limited: boolean;
  balance: {
    health: {
      active_nodes: number;
      avg_completion_pct: number;
      avg_star_rate_pct: number;
      cold_nodes: number;
      difficulty_posture: "smooth" | "spiky" | "undertuned" | "insufficient_data";
      economy_posture: "lean" | "balanced" | "generous" | "volatile" | "insufficient_data";
      gold_per_completion: number;
      nodes_with_signal: number;
      reward_pressure: number;
      xp_per_completion: number;
    };
    node_cards: Array<{
      avg_elapsed_ms: number;
      avg_risk: number;
      avg_score: number;
      avg_stars: number;
      claims: number;
      completed_runs: number;
      completion_rate_pct: number;
      economy_score: number;
      friction_score: number;
      game: string;
      gold_awarded: number;
      high_risk_runs: number;
      max_stars: number;
      node_id: string;
      node_index: number;
      node_type: string;
      progress_completions: number;
      recommendation: string;
      reward_gold: number;
      reward_pressure: number;
      reward_xp: number;
      run_count: number;
      star_rate_pct: number;
      target_ref: string | null;
      title: string;
      unique_players: number;
      xp_awarded: number;
    }>;
    recommendations: Array<{
      action: string;
      confidence: number;
      detail: string;
      game: string | null;
      id: string;
      node_id: string | null;
      node_index: number | null;
      severity: "critical" | "warning" | "opportunity";
      title: string;
      type: "difficulty" | "economy" | "retention" | "risk";
    }>;
    reward_curve: Array<{
      avg_stars: number;
      completion_rate_pct: number;
      node_index: number;
      reward_gold: number;
      reward_pressure: number;
      reward_xp: number;
      title: string;
    }>;
  };
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
