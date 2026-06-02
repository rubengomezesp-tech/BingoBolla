import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  Ban,
  Coins,
  Flame,
  Gamepad2,
  Gem,
  Gift,
  History,
  LockKeyhole,
  LogOut,
  MapPin,
  Medal,
  Scale,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ShoppingBag,
  Sparkles,
  Trophy,
  UserCircle,
  type LucideIcon,
} from "lucide-react";
import MobileTabBar from "@/components/MobileTabBar";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MASCOT =
  "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/mascot-miami/mascot-miami.PNG";

type ProfileRow = {
  age_verified: boolean | null;
  banned: boolean | null;
  diamonds?: number | string | null;
  display_name: string | null;
  gold_coins: number | string | null;
  kyc_status: string | null;
  state: string | null;
  sweeps_coins: number | string | null;
  username: string | null;
};

type StatsRow = {
  best_streak: number | null;
  full_houses_won: number | null;
  games_played: number | null;
  total_wins: number | null;
};

type LimitsRow = {
  daily_deposit_limit: number | string | null;
  daily_loss_limit: number | string | null;
  daily_wager_limit: number | string | null;
  monthly_deposit_limit: number | string | null;
  reality_check_interval_minutes: number | null;
  session_minutes_limit: number | null;
  weekly_deposit_limit: number | string | null;
  weekly_loss_limit: number | string | null;
  weekly_wager_limit: number | string | null;
};

type ExclusionRow = {
  ends_at: string | null;
  period_type: string;
};

type BadgeTone = "good" | "warn" | "danger" | "muted";

type StatusBadge = {
  Icon: LucideIcon;
  label: string;
  tone: BadgeTone;
};

const compactFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});

const moneyFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

async function signOutAction() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: stats }, { data: limits }, { data: exclusion }, { data: excludedStates }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username,display_name,state,age_verified,kyc_status,gold_coins,sweeps_coins,diamonds,banned")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>(),
      supabase
        .from("player_stats")
        .select("games_played,total_wins,full_houses_won,best_streak")
        .eq("player_id", user.id)
        .maybeSingle<StatsRow>(),
      supabase
        .from("rg_limits")
        .select(
          "daily_deposit_limit,weekly_deposit_limit,monthly_deposit_limit,daily_wager_limit,weekly_wager_limit,daily_loss_limit,weekly_loss_limit,session_minutes_limit,reality_check_interval_minutes",
        )
        .eq("player_id", user.id)
        .maybeSingle<LimitsRow>(),
      supabase
        .from("self_exclusions")
        .select("period_type,ends_at")
        .eq("player_id", user.id)
        .eq("active", true)
        .maybeSingle<ExclusionRow>(),
      supabase.from("excluded_states").select("state").eq("blocks_sweeps", true),
    ]);

  const displayName =
    cleanText(profile?.display_name) ||
    cleanText(profile?.username) ||
    cleanText(user.user_metadata?.display_name) ||
    user.email?.split("@")[0] ||
    "Jugador";
  const email = user.email ?? "Email no disponible";
  const initial = (displayName[0] || "B").toUpperCase();
  const gold = toNumber(profile?.gold_coins);
  const sweeps = toNumber(profile?.sweeps_coins);
  const diamonds = toNumber(profile?.diamonds);
  const excludedSet = new Set(((excludedStates as { state: string | null }[] | null) ?? []).map((entry) => entry.state));
  const stateExcluded = !!(profile?.state && excludedSet.has(profile.state));
  const kycBadge = getKycBadge(profile);
  const stateBadge = getStateBadge(profile, stateExcluded);
  const accountBadge = getAccountBadge(profile, exclusion);
  const hasLimits = hasConfiguredLimits(limits);
  const statsItems = [
    { Icon: Gamepad2, label: "Partidas", value: formatInt(stats?.games_played), tone: "#7b61ff" },
    { Icon: Trophy, label: "Victorias", value: formatInt(stats?.total_wins), tone: "#ffd93d" },
    { Icon: Medal, label: "Bingos", value: formatInt(stats?.full_houses_won), tone: "#ff3d7f" },
    { Icon: Flame, label: "Mejor racha", value: formatInt(stats?.best_streak), tone: "#ff8a3d" },
  ];
  const settings = [
    {
      Icon: Scale,
      href: "/account/limits",
      subtitle: hasLimits ? "Límites configurados" : "Sin límites configurados",
      title: "Límites de juego",
      tone: "#00e5ff",
    },
    {
      Icon: Ban,
      href: "/account/exclude",
      subtitle: exclusion ? `Activa: ${exclusion.period_type}` : "Tómate un descanso",
      title: "Auto-exclusión",
      tone: "#ff3d7f",
    },
    {
      Icon: LockKeyhole,
      href: "/account/sessions",
      subtitle: "Dispositivos conectados",
      title: "Sesiones activas",
      tone: "#00e676",
    },
    {
      Icon: Gift,
      href: "/account/prizes",
      subtitle: "Claims y premios confirmados",
      title: "Mis premios",
      tone: "#ffd93d",
    },
    {
      Icon: Gem,
      href: "/account/diamonds",
      subtitle: `${formatCompact(diamonds)} disponibles`,
      title: "Diamonds",
      tone: "#b388ff",
    },
    {
      Icon: ShoppingBag,
      href: "/store",
      subtitle: "Recargar saldo",
      title: "Tienda",
      tone: "#ff9f43",
    },
  ];

  return (
    <div className="account-page">
      <div className="account-bg" aria-hidden="true" />

      <header className="account-header">
        <Link href="/lobby" className="account-back">
          <ArrowLeft size={17} aria-hidden="true" />
          <span>Lobby</span>
        </Link>
        <div className="account-logo">
          <b>BINGO</b>
          <em>BOLLA</em>
        </div>
        <div className="account-avatar account-avatar-small" aria-label={`Cuenta de ${displayName}`}>
          {initial}
        </div>
      </header>

      <main className="account-wrap">
        <div className="account-titleRow">
          <div>
            <p className="account-kicker">Perfil y seguridad</p>
            <h1>Mi cuenta</h1>
          </div>
          <Link href="/onboarding" className="account-verifyLink">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Onboarding</span>
          </Link>
        </div>

        <section className="account-profile" aria-labelledby="account-profile-title">
          <img className="account-mascot" src={MASCOT} alt="" />
          <div className="account-profileTop">
            <div className="account-avatar account-avatar-large" aria-hidden="true">
              {initial}
            </div>
            <div className="account-profileMeta">
              <h2 id="account-profile-title">{displayName}</h2>
              <p>{email}</p>
              <div className="account-badges">
                <Badge badge={accountBadge} />
                <Badge badge={kycBadge} />
                <Badge badge={stateBadge} />
              </div>
            </div>
          </div>

          {(exclusion || stateExcluded || kycBadge.tone !== "good") && (
            <div className={`account-alert account-alert-${accountBadge.tone === "danger" ? "danger" : "warn"}`}>
              <div>
                <strong>{getAlertTitle(profile, exclusion, stateExcluded)}</strong>
                <span>{getAlertCopy(profile, exclusion, stateExcluded)}</span>
              </div>
              <Link href={exclusion ? "/account/exclude" : "/onboarding"}>Revisar</Link>
            </div>
          )}

          <div className="account-balances">
            <Balance label="Gold" value={formatCompact(gold)} Icon={Coins} tone="#ffd93d" />
            <Balance label="Sweeps" value={`$${moneyFormatter.format(sweeps)}`} Icon={Sparkles} tone="#00e5ff" />
            <Balance label="Diamonds" value={formatCompact(diamonds)} Icon={Gem} tone="#b388ff" />
          </div>
        </section>

        <section aria-labelledby="account-stats-title">
          <SectionTitle id="account-stats-title" title="Estadísticas" />
          <div className="account-stats">
            {statsItems.map((item) => (
              <div className="account-stat" key={item.label}>
                <div className="account-statIcon" style={{ "--tone": item.tone } as CSSProperties}>
                  <item.Icon size={22} aria-hidden="true" />
                </div>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        {exclusion && (
          <section className="account-exclusion" aria-label="Auto-exclusión activa">
            <Ban size={22} aria-hidden="true" />
            <div>
              <strong>Auto-exclusión activa</strong>
              <span>
                Período {exclusion.period_type}
                {exclusion.ends_at ? ` · termina ${formatDate(exclusion.ends_at)}` : " · permanente"}
              </span>
            </div>
          </section>
        )}

        <section aria-labelledby="account-settings-title">
          <SectionTitle id="account-settings-title" title="Ajustes y seguridad" />
          <div className="account-settings">
            {settings.map((item) => (
              <SettingTile key={item.href} {...item} />
            ))}
          </div>
        </section>

        <section className="account-help">
          <History size={18} aria-hidden="true" />
          <p>
            Si sientes que estás perdiendo el control, activa límites o auto-exclusión. Ayuda 24/7:
            <strong> 1-800-GAMBLER</strong>.
          </p>
        </section>

        <form action={signOutAction}>
          <button className="account-logout" type="submit">
            <LogOut size={18} aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </form>
      </main>

      <MobileTabBar />

      <style>{`
        .account-page{
          --account-bg:#08080c;--account-surface:rgba(18,18,30,.72);--account-line:rgba(255,255,255,.1);
          position:relative;min-height:100dvh;color:#fff;overflow-x:hidden;
          padding-bottom:calc(112px + env(safe-area-inset-bottom,0px));
        }
        .account-page *{box-sizing:border-box}
        .account-page a{color:inherit;text-decoration:none}
        .account-bg{position:fixed;inset:0;z-index:0;background:
          radial-gradient(820px 420px at 82% -8%,rgba(255,61,127,.22),transparent 62%),
          radial-gradient(720px 520px at -12% 34%,rgba(0,229,255,.13),transparent 58%),
          radial-gradient(680px 520px at 75% 76%,rgba(255,217,61,.1),transparent 56%),
          var(--account-bg)}
        .account-header{position:relative;z-index:5;display:flex;align-items:center;justify-content:space-between;
          gap:14px;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.08);
          background:rgba(8,8,12,.74);backdrop-filter:blur(16px)}
        .account-back,.account-verifyLink{display:inline-flex;align-items:center;gap:7px;min-height:38px;
          font-size:14px;font-weight:800;color:rgba(255,255,255,.72)}
        .account-back:hover,.account-verifyLink:hover{color:#fff}
        .account-logo{font-weight:950;font-size:20px;letter-spacing:0}
        .account-logo em{color:#ffd93d;font-style:normal;text-shadow:0 0 14px rgba(255,217,61,.36)}
        .account-avatar{display:grid;place-items:center;border-radius:50%;
          background:linear-gradient(135deg,#ff3d7f,#ffd93d);color:white;font-weight:950}
        .account-avatar-small{width:38px;height:38px;font-size:15px}
        .account-wrap{position:relative;z-index:5;width:min(100%,900px);margin:0 auto;
          padding:24px clamp(14px,4vw,26px) calc(30px + env(safe-area-inset-bottom,0px))}
        .account-titleRow{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:18px}
        .account-kicker{margin:0 0 5px;color:#00e5ff;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:.18em}
        .account-titleRow h1{margin:0;font-size:clamp(32px,8vw,48px);font-weight:950;letter-spacing:0;line-height:.95}
        .account-verifyLink{flex-shrink:0;border:1px solid rgba(255,255,255,.1);border-radius:999px;
          padding:0 12px;background:rgba(255,255,255,.05);font-size:12px}
        .account-profile{position:relative;overflow:hidden;padding:clamp(18px,4vw,28px);border-radius:24px;
          background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.035)),var(--account-surface);
          border:1px solid rgba(255,255,255,.11);box-shadow:0 24px 60px rgba(0,0,0,.28)}
        .account-mascot{position:absolute;right:0;top:0;width:150px;height:150px;object-fit:contain;opacity:.9;
          filter:drop-shadow(0 12px 24px rgba(0,229,255,.16));pointer-events:none}
        .account-profileTop{position:relative;display:flex;align-items:flex-start;gap:18px;min-width:0}
        .account-avatar-large{width:86px;height:86px;flex:0 0 auto;font-size:38px;box-shadow:0 12px 32px rgba(255,61,127,.28)}
        .account-profileMeta{min-width:0;padding-right:120px}
        .account-profileMeta h2{margin:0;font-size:clamp(26px,6vw,36px);font-weight:950;letter-spacing:0;line-height:1;
          overflow-wrap:anywhere}
        .account-profileMeta p{margin:7px 0 13px;color:rgba(255,255,255,.55);font-size:14px;overflow-wrap:anywhere}
        .account-badges{display:flex;flex-wrap:wrap;gap:8px}
        .account-badge{display:inline-flex;align-items:center;gap:6px;min-height:28px;border-radius:999px;padding:0 10px;
          border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.055);
          color:rgba(255,255,255,.74);font-size:11px;font-weight:950;letter-spacing:0;text-transform:uppercase}
        .account-badge-good{border-color:rgba(0,230,118,.35);background:rgba(0,230,118,.12);color:#80f5b8}
        .account-badge-warn{border-color:rgba(255,217,61,.36);background:rgba(255,217,61,.11);color:#ffe57a}
        .account-badge-danger{border-color:rgba(255,61,127,.36);background:rgba(255,61,127,.12);color:#ff9fbd}
        .account-badge-muted{color:rgba(255,255,255,.58)}
        .account-alert{position:relative;margin-top:20px;display:flex;align-items:center;justify-content:space-between;gap:16px;
          border-radius:18px;padding:14px 16px;border:1px solid rgba(255,217,61,.24);background:rgba(255,217,61,.08)}
        .account-alert-danger{border-color:rgba(255,61,127,.35);background:rgba(255,61,127,.1)}
        .account-alert strong{display:block;font-size:14px;font-weight:950}
        .account-alert span{display:block;margin-top:3px;color:rgba(255,255,255,.62);font-size:13px;line-height:1.35}
        .account-alert a{flex-shrink:0;border-radius:999px;background:#fff;color:#11131c;padding:9px 12px;font-size:12px;font-weight:950}
        .account-balances{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:22px;padding-top:20px;
          border-top:1px solid var(--account-line)}
        .account-balance,.account-stat,.account-setting{min-width:0;border-radius:18px;border:1px solid rgba(255,255,255,.1);
          background:rgba(255,255,255,.045)}
        .account-balance{padding:15px}
        .account-balanceIcon,.account-statIcon,.account-settingIcon{display:grid;place-items:center;color:var(--tone);
          background:color-mix(in srgb,var(--tone) 14%,transparent);border:1px solid color-mix(in srgb,var(--tone) 30%,transparent)}
        .account-balanceIcon{width:38px;height:38px;border-radius:12px;margin-bottom:10px}
        .account-balance span,.account-stat span,.account-setting span{display:block;color:rgba(255,255,255,.5);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}
        .account-balance strong{display:block;margin-top:4px;font-size:clamp(18px,4.8vw,24px);font-weight:950;letter-spacing:0;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .account-sectionTitle{margin:28px 0 13px;color:rgba(255,255,255,.55);font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.16em}
        .account-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
        .account-stat{display:flex;align-items:center;gap:12px;padding:16px}
        .account-statIcon{width:44px;height:44px;flex:0 0 auto;border-radius:14px}
        .account-stat strong{display:block;margin-top:3px;font-size:24px;font-weight:950;letter-spacing:0}
        .account-exclusion{display:flex;gap:13px;align-items:flex-start;margin-top:22px;padding:16px;border-radius:18px;
          background:rgba(255,61,127,.1);border:1px solid rgba(255,61,127,.34);color:#ff9fbd}
        .account-exclusion strong{display:block;color:#fff;font-weight:950}
        .account-exclusion span{display:block;margin-top:4px;color:rgba(255,255,255,.65);font-size:13px;line-height:1.4}
        .account-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .account-setting{display:flex;align-items:center;gap:13px;padding:16px;transition:border-color .18s ease,background .18s ease,transform .18s ease}
        .account-setting:hover{border-color:color-mix(in srgb,var(--tone) 45%,rgba(255,255,255,.1));background:rgba(255,255,255,.065);transform:translateY(-1px)}
        .account-settingIcon{width:44px;height:44px;flex:0 0 auto;border-radius:14px}
        .account-settingText{min-width:0;flex:1}
        .account-settingText strong{display:block;font-size:15px;font-weight:950;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .account-settingText span{margin-top:3px;text-transform:none;letter-spacing:0;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .account-settingArrow{color:rgba(255,255,255,.42);font-size:20px;font-weight:900}
        .account-help{display:flex;align-items:flex-start;gap:10px;margin-top:24px;border-top:1px solid var(--account-line);
          padding-top:18px;color:rgba(255,255,255,.55)}
        .account-help p{margin:0;font-size:12px;line-height:1.55}
        .account-help strong{color:#fff}
        .account-logout{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;margin-top:20px;min-height:50px;
          border-radius:16px;border:1px solid rgba(255,61,127,.34);background:rgba(255,61,127,.1);
          color:#ff9fbd;font:inherit;font-size:15px;font-weight:950;cursor:pointer}
        .account-logout:hover{background:rgba(255,61,127,.15);color:#fff}
        @media(max-width:480px){
          .account-titleRow{align-items:flex-start}
          .account-verifyLink span{display:none}
          .account-profileMeta{padding-right:70px}
          .account-mascot{width:104px;height:104px;opacity:.45}
          .account-profileTop{gap:13px}
          .account-avatar-large{width:74px;height:74px;font-size:32px}
          .account-balances,.account-settings{grid-template-columns:1fr}
          .account-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
          .account-alert{align-items:flex-start;flex-direction:column}
          .account-alert a{width:100%;text-align:center}
        }
        @media(max-width:360px){
          .account-stats{grid-template-columns:1fr}
          .account-profileTop{flex-direction:column}
          .account-profileMeta{padding-right:0}
        }
      `}</style>
    </div>
  );
}

function Badge({ badge }: { badge: StatusBadge }) {
  const Icon = badge.Icon;

  return (
    <span className={`account-badge account-badge-${badge.tone}`}>
      <Icon size={13} aria-hidden="true" />
      {badge.label}
    </span>
  );
}

function Balance({
  Icon,
  label,
  tone,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <div className="account-balance">
      <div className="account-balanceIcon" style={{ "--tone": tone } as CSSProperties}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionTitle({ id, title }: { id: string; title: string }) {
  return (
    <h2 className="account-sectionTitle" id={id}>
      {title}
    </h2>
  );
}

function SettingTile({
  Icon,
  href,
  subtitle,
  title,
  tone,
}: {
  Icon: LucideIcon;
  href: string;
  subtitle: string;
  title: string;
  tone: string;
}) {
  return (
    <Link className="account-setting" href={href} style={{ "--tone": tone } as CSSProperties}>
      <div className="account-settingIcon">
        <Icon size={21} aria-hidden="true" />
      </div>
      <div className="account-settingText">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="account-settingArrow" aria-hidden="true">
        →
      </div>
    </Link>
  );
}

function cleanText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatCompact(value: number) {
  return value >= 10000 ? compactFormatter.format(value) : formatInt(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "fecha pendiente" : dateFormatter.format(date);
}

function formatInt(value: number | string | null | undefined) {
  return Math.trunc(toNumber(value)).toLocaleString("en-US");
}

function getAccountBadge(profile: ProfileRow | null, exclusion: ExclusionRow | null): StatusBadge {
  if (exclusion) return { Icon: Ban, label: "Auto-excluida", tone: "danger" };
  if (profile?.banned) return { Icon: ShieldAlert, label: "Bloqueada", tone: "danger" };
  return { Icon: UserCircle, label: "Activa", tone: "good" };
}

function getAlertCopy(profile: ProfileRow | null, exclusion: ExclusionRow | null, stateExcluded: boolean) {
  if (exclusion) {
    return exclusion.ends_at
      ? `No se puede jugar ni comprar hasta ${formatDate(exclusion.ends_at)}.`
      : "La cuenta está excluida de forma permanente.";
  }
  if (profile?.banned) return "La cuenta tiene un bloqueo activo. Revisa tu estado antes de jugar.";
  if (stateExcluded) return "Tu estado permite Gold, pero bloquea juego o premios con Sweeps.";
  if (!profile?.kyc_status || profile.kyc_status === "unverified") return "Completa onboarding para activar juego con Sweeps.";
  if (profile.kyc_status === "pending") return "Tu verificación está en revisión.";
  if (profile.kyc_status === "rejected") return "La verificación fue rechazada y necesita revisión.";
  if (!profile.state) return "Falta registrar tu estado para validar elegibilidad.";
  return "Revisa los datos de tu cuenta.";
}

function getAlertTitle(profile: ProfileRow | null, exclusion: ExclusionRow | null, stateExcluded: boolean) {
  if (exclusion) return "Acceso suspendido por auto-exclusión";
  if (profile?.banned) return "Cuenta bloqueada";
  if (stateExcluded) return "Sweeps no disponible en tu estado";
  if (!profile?.kyc_status || profile.kyc_status === "unverified") return "Onboarding pendiente";
  if (profile.kyc_status === "pending") return "Verificación pendiente";
  if (profile.kyc_status === "rejected") return "Verificación rechazada";
  if (!profile.state) return "Estado pendiente";
  return "Cuenta necesita revisión";
}

function getKycBadge(profile: ProfileRow | null): StatusBadge {
  if (profile?.kyc_status === "verified") return { Icon: ShieldCheck, label: "KYC verificado", tone: "good" };
  if (profile?.kyc_status === "self_declared" && profile.age_verified) {
    return { Icon: ShieldCheck, label: "Edad confirmada", tone: "good" };
  }
  if (profile?.kyc_status === "pending") return { Icon: ShieldQuestion, label: "KYC pendiente", tone: "warn" };
  if (profile?.kyc_status === "rejected") return { Icon: ShieldAlert, label: "KYC rechazado", tone: "danger" };
  return { Icon: ShieldQuestion, label: "Onboarding pendiente", tone: "warn" };
}

function getStateBadge(profile: ProfileRow | null, stateExcluded: boolean): StatusBadge {
  if (!profile?.state) return { Icon: MapPin, label: "Estado pendiente", tone: "warn" };
  if (stateExcluded) return { Icon: MapPin, label: `${profile.state} sin Sweeps`, tone: "danger" };
  return { Icon: MapPin, label: profile.state, tone: "muted" };
}

function hasConfiguredLimits(limits: LimitsRow | null) {
  if (!limits) return false;

  return [
    limits.daily_deposit_limit,
    limits.weekly_deposit_limit,
    limits.monthly_deposit_limit,
    limits.daily_wager_limit,
    limits.weekly_wager_limit,
    limits.daily_loss_limit,
    limits.weekly_loss_limit,
    limits.session_minutes_limit,
  ].some((value) => value !== null && value !== undefined);
}

function toNumber(value: number | string | null | undefined) {
  const next = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}
