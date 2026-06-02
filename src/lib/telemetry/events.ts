export const GAMEPLAY_EVENT_NAMES = [
  "events.recommended_open",
  "events.action_open",
  "events.tab_select",
  "lobby.action_open",
  "lobby.room_open",
  "world.node_start",
  "world.node_complete",
  "room.ticket_buy",
  "room.strip_buy",
  "room.bingo_claim",
  "bolla_master.spin_start",
  "bolla_master.spin_result",
  "bolla_master.refill",
  "bolla_master.upgrade",
  "store.package_open",
] as const;

export const GAMEPLAY_SURFACES = [
  "account",
  "bolla_master",
  "eventos",
  "lobby",
  "mundomiami",
  "mundos",
  "room",
  "store",
] as const;

export type GameplayEventName = (typeof GAMEPLAY_EVENT_NAMES)[number];
export type GameplaySurface = (typeof GAMEPLAY_SURFACES)[number];
