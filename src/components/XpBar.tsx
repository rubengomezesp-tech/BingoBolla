"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

type XpData = {
  xp: number;
  level: number;
  xp_into_level: number;
  xp_needed_level: number;
  progress_pct: number;
};

export default function XpBar({
  onToast,
}: {
  onToast?: (label: string, msg: string, detail: string) => void;
}) {
  const supabase = createClient();
  const [data, setData] = useState<XpData | null>(null);
  const [animPct, setAnimPct] = useState(0);

  const load = useCallback(async () => {
    const { data: rows, error } = await supabase.rpc("get_player_xp", {
      p_player_id: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error || !rows || !rows[0]) return;
    const r = rows[0];
    setData({
      xp: Number(r.xp),
      level: Number(r.level),
      xp_into_level: Number(r.xp_into_level),
      xp_needed_level: Number(r.xp_needed_level),
      progress_pct: Number(r.progress_pct),
    });
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) Login diario automático (+15 EXP, 1 vez/día)
      try {
        const { data: daily } = await supabase.rpc("claim_daily_xp");
        const d = daily?.[0];
        if (!cancelled && d?.claimed) {
          onToast?.("Diario", "+15 EXP", "Por entrar hoy");
          if (d.leveled_up) {
            setTimeout(
              () => onToast?.("Nivel", `Nivel ${d.new_level}`, "Subiste de nivel"),
              2400
            );
          }
        }
      } catch {
        /* si falla, no rompe nada */
      }
      // 2) Cargar progreso para pintar la barra
      if (!cancelled) await load();
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, load, onToast]);

  // animar la barra al cargar (de 0 al % real, estilo Monopoly GO)
  useEffect(() => {
    if (!data) return;
    const target = Math.min(100, Math.max(0, data.progress_pct));
    const t = setTimeout(() => setAnimPct(target), 120);
    return () => clearTimeout(t);
  }, [data]);

  if (!data) return null; // degradación elegante: si no carga, no se muestra

  return (
    <div className="xpbar-wrap">
      <style>{XP_CSS}</style>
      <div className="xpbar-badge">
        <span className="xpbar-lvNum">{data.level}</span>
        <span className="xpbar-lvLbl">NVL</span>
      </div>
      <div className="xpbar-body">
        <div className="xpbar-top">
          <span className="xpbar-title">Nivel {data.level}</span>
          <span className="xpbar-nums">
            {data.xp_into_level.toLocaleString()} /{" "}
            {data.xp_needed_level.toLocaleString()} EXP
          </span>
        </div>
        <div className="xpbar-track">
          <div
            className="xpbar-fill"
            style={{ transform: `scaleX(${animPct / 100})` }}
          />
        </div>
      </div>
    </div>
  );
}

const XP_CSS = `
.xpbar-wrap{display:flex;align-items:center;gap:10px;flex:1;min-width:160px;
  max-width:520px;}
.xpbar-badge{position:relative;width:44px;height:44px;border-radius:8px;
  flex-shrink:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;
  background:linear-gradient(180deg,#fff07f,#ffd93d 55%,#c77700);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.55);
  color:#251400;}
.xpbar-lvNum{font-weight:800;font-size:18px;line-height:.9;}
.xpbar-lvLbl{font-size:7px;font-weight:800;letter-spacing:.1em;opacity:.75;}
.xpbar-body{flex:1;min-width:0;}
.xpbar-top{display:flex;justify-content:space-between;align-items:baseline;
  margin-bottom:5px;gap:8px;}
.xpbar-title{font-size:12px;font-weight:800;color:#fff;white-space:nowrap;}
.xpbar-nums{font-size:10px;color:#c9c4d4;font-weight:700;white-space:nowrap;}
.xpbar-track{height:12px;border-radius:999px;background:rgba(255,255,255,.08);
  overflow:hidden;border:1px solid rgba(255,255,255,.12);}
.xpbar-fill{width:100%;height:100%;border-radius:999px;
  background:linear-gradient(90deg,#00e5ff,#ff3d7f 58%,#ffd93d);
  box-shadow:0 0 10px rgba(255,217,61,.32);
  transform-origin:left center;
  transition:transform .7s cubic-bezier(.16,1,.3,1);}
@media(max-width:520px){
  .xpbar-wrap{max-width:none;width:100%;order:5;margin-top:8px;}
}
`;
