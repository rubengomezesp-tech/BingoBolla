import { NextResponse } from "next/server";
import {
  UUID_RE,
  apiError,
  isRecord,
  readJsonRecord,
  requireAuthenticatedUser,
  requireServiceClient,
} from "@/lib/server/api";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "rubengomezesp@gmail.com";

type CoordinateUpdate = {
  node_id: string;
  pos_x: number;
  pos_y: number;
};

function parseCoordinateUpdates(value: unknown): CoordinateUpdate[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;

  const updates: CoordinateUpdate[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;

    const nodeId = String(item.node_id ?? "");
    const posX = Number(item.pos_x);
    const posY = Number(item.pos_y);

    if (!UUID_RE.test(nodeId)) return null;
    if (!Number.isFinite(posX) || posX < 0 || posX > 100) return null;
    if (!Number.isFinite(posY) || posY < 0 || posY > 100) return null;

    updates.push({
      node_id: nodeId,
      pos_x: Number(posX.toFixed(2)),
      pos_y: Number(posY.toFixed(2)),
    });
  }

  return updates;
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  if (auth.user.email !== ADMIN_EMAIL) {
    return apiError("forbidden", 403);
  }

  const body = await readJsonRecord(request);
  const updates = parseCoordinateUpdates(body?.nodes);
  if (!updates) {
    return apiError("invalid_coordinates", 400);
  }

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  for (const update of updates) {
    const { error } = await service.supabase
      .from("world_nodes")
      .update({ pos_x: update.pos_x, pos_y: update.pos_y })
      .eq("id", update.node_id);

    if (error) return apiError("coordinate_update_failed", 500);
  }

  return NextResponse.json({ ok: true, updated: updates.length });
}
