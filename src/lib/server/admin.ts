import {
  apiError,
  requireAuthenticatedUser,
  requireServiceClient,
} from "@/lib/server/api";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(/[,\s]+/)
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined) {
  const normalized = String(email ?? "").trim().toLowerCase();
  return Boolean(normalized && ADMIN_EMAILS.includes(normalized));
}

export async function requireAdminContext() {
  const auth = await requireAuthenticatedUser();
  if ("error" in auth) return { ok: false, response: auth.error } as const;

  if (!isAdminEmail(auth.user.email)) {
    return { ok: false, response: apiError("forbidden", 403) } as const;
  }

  const service = requireServiceClient();
  if ("error" in service) return { ok: false, response: service.error } as const;

  return { ok: true, user: auth.user, supabase: service.supabase } as const;
}
