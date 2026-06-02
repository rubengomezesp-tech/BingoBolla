import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const E2E_EMAIL = process.env.E2E_USER_EMAIL;
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD;

const E2E_STATE = (process.env.E2E_USER_STATE ?? "FL").trim().toUpperCase();
const E2E_COUNTRY = (process.env.E2E_USER_COUNTRY ?? "US").trim().toUpperCase();
const E2E_DATE_OF_BIRTH = process.env.E2E_USER_DATE_OF_BIRTH ?? "1990-01-01";
const TERMS_VERSION = "2026-06-02";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

if (!E2E_EMAIL || !E2E_PASSWORD) {
  fail("Set E2E_USER_EMAIL and E2E_USER_PASSWORD before seeding the smoke user.");
}

if (E2E_PASSWORD.length < 8) {
  fail("E2E_USER_PASSWORD must be at least 8 characters.");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      "X-Client-Info": "bingobolla-e2e-seed",
    },
  },
});

const metadata = {
  username: normalizeUsername(process.env.E2E_USER_USERNAME ?? E2E_EMAIL.split("@")[0]),
  age_gate_confirmed: true,
  terms_accepted: true,
  terms_accepted_at: new Date().toISOString(),
  terms_version: TERMS_VERSION,
};

const user = await ensureAuthUser();
const username = normalizeUsername(process.env.E2E_USER_USERNAME ?? `e2e_${user.id.replaceAll("-", "").slice(0, 12)}`);
const referralCode = `e2e_${user.id.replaceAll("-", "").slice(0, 12)}`;

await ensureProfile(user.id, username, referralCode);
await submitOnboarding(user.id);
await assertSmokeReady(user.id);

console.log(`E2E smoke user ready: ${E2E_EMAIL}`);

async function ensureAuthUser() {
  const existing = await findUserByEmail(E2E_EMAIL);
  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error || !data.user) {
      fail(`Unable to create E2E user: ${error?.message ?? "missing user"}`);
    }

    return data.user;
  }

  const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (error || !data.user) {
    fail(`Unable to update E2E user: ${error?.message ?? "missing user"}`);
  }

  return data.user;
}

async function findUserByEmail(email) {
  const target = email.toLowerCase();
  let page = 1;

  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(`Unable to list auth users: ${error.message}`);

    const users = data?.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === target);
    if (match) return match;
    if (users.length < 1000) return null;
    page += 1;
  }

  fail("Unable to find user after scanning 50,000 auth users.");
}

async function ensureProfile(userId, username, referralCode) {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        username,
        display_name: "E2E Smoke",
        state: E2E_STATE,
        country: E2E_COUNTRY,
        date_of_birth: E2E_DATE_OF_BIRTH,
        age_verified: true,
        kyc_status: "self_declared",
        kyc_provider: "self",
        kyc_verified_at: now,
        signup_age_gate_confirmed: true,
        terms_accepted_at: now,
        terms_version: TERMS_VERSION,
        referral_code: referralCode,
        banned: false,
      },
      { onConflict: "id" }
    );

  if (error) fail(`Unable to upsert E2E profile: ${error.message}`);
}

async function submitOnboarding(userId) {
  const { error } = await admin.rpc("service_submit_onboarding", {
    p_actor_id: userId,
    p_date_of_birth: E2E_DATE_OF_BIRTH,
    p_state: E2E_STATE,
    p_country: E2E_COUNTRY,
  });

  if (error) fail(`Unable to submit E2E onboarding: ${error.message}`);
}

async function assertSmokeReady(userId) {
  const { data, error } = await admin
    .from("profiles")
    .select("id, state, age_verified, kyc_status, banned, signup_age_gate_confirmed, terms_accepted_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) fail(`Unable to read E2E profile: ${error.message}`);
  if (!data) fail("E2E profile was not created.");
  if (data.banned) fail("E2E profile is banned.");
  if (data.state !== E2E_STATE) fail(`E2E profile state mismatch: ${data.state}`);
  if (!data.age_verified) fail("E2E profile is not age verified.");
  if (!data.signup_age_gate_confirmed) fail("E2E profile is missing age gate evidence.");
  if (!data.terms_accepted_at) fail("E2E profile is missing terms evidence.");
  if (!["self_declared", "verified"].includes(data.kyc_status)) {
    fail(`E2E profile is not onboarded: ${data.kyc_status}`);
  }
}

function normalizeUsername(value) {
  const username = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20);

  return /^[a-z0-9_]{3,20}$/.test(username) ? username : "e2e_smoke";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
