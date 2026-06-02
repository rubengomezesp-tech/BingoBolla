import {
  apiError,
  requireAuthenticatedUser,
  requireServiceClient,
} from "@/lib/server/api";

export const ADMIN_EMAIL = "rubengomezesp@gmail.com";

export function isAdminEmail(email: string | null | undefined) {
  return String(email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
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
