import { NextResponse } from "next/server";
import {
  apiError,
  readJsonRecord,
  requireAuthenticatedUser,
  requireServiceClient,
  safeRpcError,
} from "@/lib/server/api";

export const dynamic = "force-dynamic";

const STATE_RE = /^[A-Z]{2}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;

function readIsoDate(value: unknown) {
  const date = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime())) return null;

  const year = parsed.getUTCFullYear();
  const nowYear = new Date().getUTCFullYear();
  if (year < 1900 || year > nowYear) return null;

  return date;
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return auth.error;

  const service = requireServiceClient();
  if ("error" in service) return service.error;

  const body = await readJsonRecord(request);
  if (!body) return apiError("invalid_json", 400);

  const dateOfBirth = readIsoDate(body.date_of_birth);
  const state = String(body.state ?? "").trim().toUpperCase();
  const country = String(body.country ?? "US").trim().toUpperCase();

  if (!dateOfBirth || !STATE_RE.test(state) || !COUNTRY_RE.test(country)) {
    return apiError("invalid_onboarding", 400);
  }

  const { data, error } = await service.supabase.rpc("service_submit_onboarding", {
    p_actor_id: auth.user.id,
    p_date_of_birth: dateOfBirth,
    p_state: state,
    p_country: country,
  });

  if (error) {
    return apiError(safeRpcError(error, "onboarding_failed"), 400);
  }

  return NextResponse.json({ data });
}
