export type Profile = {
  id: string;
  username: string;
  referral_code?: string;
  display_name: string | null;
  state: string | null;
  country?: string | null;
  date_of_birth?: string | null;
  age_verified: boolean;
  signup_age_gate_confirmed?: boolean;
  terms_accepted_at?: string | null;
  terms_version?: string | null;
  gold_coins: number;
  sweeps_coins: number;
  total_won_sweeps: number;
  banned: boolean;
  created_at: string;
  kyc_status?: string; // Más flexible para aceptar cualquier valor
};

export type Room = {
  id: string;
  name: string;
  variant: "bingo75" | "bingo90" | "lite" | "cinco" | "pulse";
  ticket_gold: number;
  ticket_sweeps: number;
  max_cards_per_player: number;
  ball_interval_ms: number;
  win_pattern: string;
  active: boolean;
};

export type RoomLive = Room & {
  current_game_id: string | null;
  game_status: "waiting" | "playing" | "finished" | null;
  pot_gold: number | null;
  pot_sweeps: number | null;
  cards_in_play: number;
  players_in_play: number;
};

export type Game = {
  id: string;
  room_id: string;
  status: "waiting" | "playing" | "finished" | "cancelled";
  pot_gold: number;
  pot_sweeps: number;
  starts_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type Card = {
  id: string;
  game_id: string;
  player_id: string;
  card_data: (number | "FREE")[][];
  currency: "gold" | "sweeps";
  price: number;
};

export type BallCalled = {
  game_id: string;
  ball_number: number;
  sequence: number;
  called_at: string;
};
