"use client";

import {
  GAMEPLAY_EVENT_NAMES,
  GAMEPLAY_SURFACES,
  type GameplayEventName,
  type GameplaySurface,
} from "@/lib/telemetry/events";

type GameplayTrackingInput = {
  eventName: GameplayEventName;
  metadata?: Record<string, unknown>;
  surface: GameplaySurface;
};

const EVENT_SET = new Set<string>(GAMEPLAY_EVENT_NAMES);
const SURFACE_SET = new Set<string>(GAMEPLAY_SURFACES);

function clientEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function trackGameplayEvent({ eventName, metadata, surface }: GameplayTrackingInput) {
  if (typeof window === "undefined") return;
  if (!EVENT_SET.has(eventName) || !SURFACE_SET.has(surface)) return;

  const body = {
    client_event_id: clientEventId(),
    event_name: eventName,
    metadata: metadata ?? {},
    path: window.location.pathname,
    surface,
    viewport: {
      height: window.innerHeight,
      width: window.innerWidth,
    },
  };

  void fetch("/api/telemetry", {
    body: JSON.stringify(body),
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    method: "POST",
  }).catch(() => {
    // Tracking must never interrupt gameplay.
  });
}
