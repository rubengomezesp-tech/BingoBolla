import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Coins,
  Crown,
  Gem,
  Medal,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Prize = {
  pattern: string;
  prize_gold: number | string | null;
  prize_sweeps: number | string | null;
  claimed_at: string;
  room: string | null;
};

type PatternMeta = {
  label: string;
  copy: string;
  Icon: LucideIcon;
  tone: "line" | "two" | "bingo" | "jackpot";
};

const PATTERN_META: Record<string, PatternMeta> = {
  line: {
    label: "Línea",
    copy: "Primera línea validada",
    Icon: Medal,
    tone: "line",
  },
  two_lines: {
    label: "Doble línea",
    copy: "Segundo hito de ronda",
    Icon: Sparkles,
    tone: "two",
  },
  full_house: {
    label: "Bingo",
    copy: "Cartón completo confirmado",
    Icon: Trophy,
    tone: "bingo",
  },
  jackpot: {
    label: "Jackpot",
    copy: "Bote acumulado liberado",
    Icon: Crown,
    tone: "jackpot",
  },
};

const goldFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function PrizesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: history } = await supabase.rpc("my_prize_history");
  const prizes = Array.isArray(history) ? (history as Prize[]) : [];

  const totalSweeps = prizes.reduce((sum, prize) => sum + toNumber(prize.prize_sweeps), 0);
  const totalGold = prizes.reduce((sum, prize) => sum + toNumber(prize.prize_gold), 0);
  const bestPrize = prizes.reduce<Prize | null>((best, prize) => {
    if (!best) return prize;
    return toNumber(prize.prize_sweeps) > toNumber(best.prize_sweeps) ? prize : best;
  }, null);
  const latestPrize = prizes[0] ?? null;

  return (
    <div className="prizes-page grain">
      <header className="prizes-header">
        <div className="prizes-headerInner">
          <Link href="/account" className="prizes-back" aria-label="Volver a cuenta">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Cuenta</span>
          </Link>
          <div className="prizes-headerTitle">Mis premios</div>
          <Link href="/lobby" className="prizes-play">
            Jugar
          </Link>
        </div>
      </header>

      <main className="prizes-main">
        <section className="prizes-hero" aria-labelledby="prizes-title">
          <div className="prizes-heroCopy">
            <div className="prizes-kicker">
              <ShieldCheck size={14} aria-hidden="true" />
              Registro validado por el motor
            </div>
            <h1 id="prizes-title">Historial de premios</h1>
            <p>
              Cada premio mostrado aquí viene de un claim confirmado en sala y queda ligado a su
              ronda, patrón y hora de validación.
            </p>
          </div>

          <div className="prizes-heroPanel" aria-label="Resumen de premios">
            <div>
              <span>Total Sweeps</span>
              <strong>${totalSweeps.toFixed(2)}</strong>
            </div>
            <div>
              <span>Total Gold</span>
              <strong>{goldFormatter.format(totalGold)}</strong>
            </div>
          </div>
        </section>

        <section className="prizes-stats" aria-label="Indicadores de premios">
          <PrizeStat
            label="Premios"
            value={String(prizes.length)}
            detail={latestPrize ? `Último: ${formatDate(latestPrize.claimed_at)}` : "Sin claims todavía"}
            Icon={ReceiptText}
          />
          <PrizeStat
            label="Mejor premio"
            value={bestPrize ? `$${toNumber(bestPrize.prize_sweeps).toFixed(2)}` : "$0.00"}
            detail={bestPrize ? getPattern(bestPrize.pattern).label : "Esperando victoria"}
            Icon={Gem}
          />
          <PrizeStat
            label="Gold ganado"
            value={goldFormatter.format(totalGold)}
            detail="Créditos promocionales acumulados"
            Icon={Coins}
          />
        </section>

        <section className="prizes-ledger" aria-labelledby="ledger-title">
          <div className="prizes-sectionHead">
            <div>
              <span>Ledger</span>
              <h2 id="ledger-title">Premios confirmados</h2>
            </div>
            <div className="prizes-count">{prizes.length}</div>
          </div>

          {prizes.length === 0 ? (
            <div className="prizes-empty">
              <div className="prizes-emptyIcon">
                <Trophy size={32} aria-hidden="true" />
              </div>
              <h3>Aún no hay premios registrados</h3>
              <p>Entra a una sala activa y completa un patrón válido para iniciar tu historial.</p>
              <Link href="/lobby" className="prizes-emptyAction">
                Ir al lobby
              </Link>
            </div>
          ) : (
            <div className="prizes-list">
              {prizes.map((prize, index) => {
                const pattern = getPattern(prize.pattern);
                const Icon = pattern.Icon;
                const sweeps = toNumber(prize.prize_sweeps);
                const gold = toNumber(prize.prize_gold);

                return (
                  <article
                    key={`${prize.claimed_at}-${prize.pattern}-${index}`}
                    className={`prizes-row prizes-row-${pattern.tone}`}
                  >
                    <div className="prizes-rowIcon" aria-hidden="true">
                      <Icon size={21} />
                    </div>
                    <div className="prizes-rowMain">
                      <div className="prizes-rowTop">
                        <h3>{pattern.label}</h3>
                        <span>{pattern.copy}</span>
                      </div>
                      <div className="prizes-rowMeta">
                        <span>{prize.room ?? "Sala"}</span>
                        <span>
                          <CalendarDays size={13} aria-hidden="true" />
                          {formatDate(prize.claimed_at)}
                        </span>
                      </div>
                    </div>
                    <div className="prizes-rowValue" aria-label="Importe del premio">
                      {sweeps > 0 && (
                        <span className="prizes-sweeps">
                          <Gem size={14} aria-hidden="true" />
                          +${sweeps.toFixed(2)}
                        </span>
                      )}
                      {gold > 0 && (
                        <span className="prizes-gold">
                          <Coins size={14} aria-hidden="true" />
                          +{goldFormatter.format(gold)}
                        </span>
                      )}
                      {sweeps <= 0 && gold <= 0 && <span className="prizes-muted">Registrado</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <style>{`
        .prizes-page{min-height:100vh;background:
          linear-gradient(180deg,rgba(255,61,127,.08),transparent 220px),
          linear-gradient(135deg,rgba(0,229,255,.04),rgba(255,217,61,.035) 45%,rgba(179,136,255,.04)),
          var(--color-bg);color:var(--color-fg);}
        .prizes-header{position:sticky;top:0;z-index:30;border-bottom:1px solid rgba(255,255,255,.08);
          background:rgba(8,8,12,.82);backdrop-filter:blur(18px) saturate(140%);
          -webkit-backdrop-filter:blur(18px) saturate(140%);}
        .prizes-headerInner{max-width:1040px;margin:0 auto;padding:12px 18px;display:grid;
          grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;}
        .prizes-back,.prizes-play{justify-self:start;display:inline-flex;align-items:center;gap:7px;
          min-height:34px;border-radius:8px;border:1px solid rgba(255,255,255,.1);
          background:rgba(255,255,255,.05);padding:0 11px;color:var(--color-fg-dim);
          font-size:13px;font-weight:800;text-decoration:none;transition:.18s ease;}
        .prizes-back:hover,.prizes-play:hover{color:#fff;border-color:rgba(255,255,255,.22);
          background:rgba(255,255,255,.09);}
        .prizes-play{justify-self:end;color:#0b0710;background:#ffd93d;border-color:rgba(255,217,61,.5);}
        .prizes-play:hover{color:#0b0710;background:#ffe57a;}
        .prizes-headerTitle{font-family:var(--font-display);font-size:22px;line-height:1;color:#fff;}
        .prizes-main{max-width:1040px;margin:0 auto;padding:30px 18px 44px;}
        .prizes-hero{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:22px;align-items:stretch;
          padding:0 0 24px;border-bottom:1px solid rgba(255,255,255,.08);}
        .prizes-heroCopy{min-width:0;padding:8px 0 0;}
        .prizes-kicker{display:inline-flex;align-items:center;gap:8px;color:var(--color-cyan);
          font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0;}
        .prizes-hero h1{margin:12px 0 10px;font-family:var(--font-display);font-size:58px;
          line-height:.94;letter-spacing:0;color:#fff;}
        .prizes-hero p{max-width:650px;margin:0;color:var(--color-fg-dim);font-size:15px;line-height:1.55;}
        .prizes-heroPanel{border:1px solid rgba(255,255,255,.12);border-radius:8px;
          background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.035));
          padding:14px;display:grid;gap:10px;align-self:end;}
        .prizes-heroPanel div{display:flex;align-items:baseline;justify-content:space-between;gap:16px;
          padding:12px;border-radius:8px;background:rgba(0,0,0,.18);}
        .prizes-heroPanel span,.prizes-sectionHead span,.prizes-statLabel{color:var(--color-fg-muted);
          font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0;}
        .prizes-heroPanel strong{font-family:var(--font-mono);font-size:23px;color:#fff;}
        .prizes-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:20px 0 22px;}
        .prizes-stat{border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(22,22,36,.72);
          padding:14px;display:grid;grid-template-columns:36px minmax(0,1fr);gap:11px;align-items:center;}
        .prizes-statIcon{width:36px;height:36px;border-radius:8px;display:grid;place-items:center;
          background:rgba(255,255,255,.06);color:var(--color-gold);}
        .prizes-statValue{margin-top:3px;font-family:var(--font-mono);font-size:22px;font-weight:900;color:#fff;}
        .prizes-statDetail{margin-top:2px;color:var(--color-fg-muted);font-size:12px;white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;}
        .prizes-ledger{padding-top:4px;}
        .prizes-sectionHead{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:12px;}
        .prizes-sectionHead h2{margin:3px 0 0;font-size:20px;line-height:1.1;color:#fff;}
        .prizes-count{min-width:34px;height:34px;border-radius:8px;display:grid;place-items:center;
          color:#0b0710;background:var(--color-cyan);font-family:var(--font-mono);font-weight:900;}
        .prizes-list{display:grid;gap:9px;}
        .prizes-row{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:12px;align-items:center;
          min-height:76px;border-radius:8px;border:1px solid rgba(255,255,255,.1);
          background:rgba(22,22,36,.76);padding:12px;transition:.18s ease;}
        .prizes-row:hover{border-color:rgba(255,255,255,.2);background:rgba(30,30,46,.86);}
        .prizes-rowIcon{width:46px;height:46px;border-radius:8px;display:grid;place-items:center;
          border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.055);}
        .prizes-row-line .prizes-rowIcon{color:var(--color-cyan);}
        .prizes-row-two .prizes-rowIcon{color:var(--color-violet);}
        .prizes-row-bingo .prizes-rowIcon{color:var(--color-magenta);}
        .prizes-row-jackpot .prizes-rowIcon{color:var(--color-gold);}
        .prizes-rowMain{min-width:0;}
        .prizes-rowTop{display:flex;align-items:baseline;gap:9px;min-width:0;}
        .prizes-rowTop h3{margin:0;font-size:16px;color:#fff;font-weight:900;}
        .prizes-rowTop span{color:var(--color-fg-muted);font-size:12px;white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;}
        .prizes-rowMeta{display:flex;align-items:center;gap:10px;min-width:0;margin-top:5px;
          color:var(--color-fg-muted);font-size:12px;}
        .prizes-rowMeta span{display:inline-flex;align-items:center;gap:5px;min-width:0;}
        .prizes-rowMeta span:first-child{max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .prizes-rowValue{display:grid;justify-items:end;gap:4px;font-family:var(--font-mono);font-size:13px;font-weight:900;}
        .prizes-rowValue span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;}
        .prizes-sweeps{color:var(--color-magenta);}
        .prizes-gold{color:var(--color-gold);}
        .prizes-muted{color:var(--color-fg-muted);}
        .prizes-empty{border:1px solid rgba(255,255,255,.1);border-radius:8px;background:rgba(22,22,36,.72);
          padding:42px 20px;text-align:center;}
        .prizes-emptyIcon{width:62px;height:62px;margin:0 auto 14px;border-radius:8px;display:grid;
          place-items:center;color:var(--color-gold);background:rgba(255,217,61,.1);
          border:1px solid rgba(255,217,61,.22);}
        .prizes-empty h3{margin:0 0 7px;font-size:20px;color:#fff;}
        .prizes-empty p{max-width:440px;margin:0 auto 18px;color:var(--color-fg-dim);font-size:14px;line-height:1.5;}
        .prizes-emptyAction{display:inline-flex;align-items:center;justify-content:center;min-height:38px;
          border-radius:8px;padding:0 14px;background:var(--color-magenta);color:#fff;
          font-weight:900;text-decoration:none;}
        @media(max-width:780px){
          .prizes-main{padding-top:22px;}
          .prizes-hero{grid-template-columns:1fr;gap:16px;}
          .prizes-heroPanel{align-self:stretch;}
          .prizes-stats{grid-template-columns:1fr;}
          .prizes-row{grid-template-columns:42px minmax(0,1fr);align-items:start;}
          .prizes-rowIcon{width:42px;height:42px;}
          .prizes-rowValue{grid-column:2;justify-items:start;display:flex;flex-wrap:wrap;}
          .prizes-rowTop{display:block;}
          .prizes-rowTop span{display:block;margin-top:3px;}
        }
        @media(max-width:520px){
          .prizes-headerInner{padding-inline:12px;grid-template-columns:auto 1fr auto;}
          .prizes-headerTitle{text-align:center;font-size:19px;}
          .prizes-back span{display:none;}
          .prizes-main{padding-inline:12px;}
          .prizes-hero h1{font-size:40px;}
          .prizes-heroPanel strong{font-size:19px;}
          .prizes-rowMeta{display:grid;gap:4px;}
        }
      `}</style>
    </div>
  );
}

function PrizeStat({
  label,
  value,
  detail,
  Icon,
}: {
  label: string;
  value: string;
  detail: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="prizes-stat">
      <div className="prizes-statIcon" aria-hidden="true">
        <Icon size={18} />
      </div>
      <div>
        <div className="prizes-statLabel">{label}</div>
        <div className="prizes-statValue">{value}</div>
        <div className="prizes-statDetail">{detail}</div>
      </div>
    </div>
  );
}

function getPattern(pattern: string) {
  return PATTERN_META[pattern] ?? {
    label: pattern,
    copy: "Premio confirmado",
    Icon: Trophy,
    tone: "bingo" as const,
  };
}

function toNumber(value: Prize["prize_gold"]) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return dateFormatter.format(date).replace(".", "");
}
