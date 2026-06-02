export type GameplayOpsWindow = "1h" | "24h" | "7d";

export type GameplayOpsPayload = {
  generated_at: string;
  window: GameplayOpsWindow;
  limited: boolean;
  health: {
    bolla_events: number;
    events_per_player: number;
    latest_at: string | null;
    mobile_pct: number;
    tab_selects: number;
    total_events: number;
    unique_players: number;
  };
  event_breakdown: Array<{
    count: number;
    event_name: string;
    last_seen: string | null;
    unique_players: number;
  }>;
  surface_breakdown: Array<{
    count: number;
    surface: string;
    unique_players: number;
  }>;
  action_breakdown: Array<{
    count: number;
    event_name: string;
    href: string | null;
    label: string | null;
    source: string | null;
    title: string | null;
  }>;
  insights: Array<{
    detail: string;
    severity: "good" | "watch" | "hot";
    title: string;
  }>;
  recent_events: Array<{
    created_at: string;
    event_name: string;
    metadata: Record<string, unknown>;
    path: string | null;
    player_ref: string;
    surface: string;
    viewport: Record<string, unknown>;
  }>;
  trend: Array<{
    bolla_master: number;
    eventos: number;
    label: string;
    other: number;
    total: number;
  }>;
};
