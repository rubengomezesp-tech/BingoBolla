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
  onToast?: (emoji: string, msg: string, detail: string) => void;
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
          onToast?.("🎁", "+15 EXP", "¡Por entrar hoy!");
          if (d.leveled_up) {
            setTimeout(
              () => onToast?.("⭐", `¡Nivel ${d.new_level}!`, "Subiste de nivel"),
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
            style={{ width: `${animPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const XP_CSS = `
.xpbar-wrap{display:flex;align-items:center;gap:10px;flex:1;min-width:160px;
  max-width:340px;}
.xpbar-badge{position:relative;width:44px;height:44px;border-radius:13px;
  flex-shrink:0;display:flex;flex-direction:column;align-items:center;
  justify-content:center;
  background:radial-gradient(circle at 35% 30%,#ffd98a,#e0901a 70%,#a06010);
  box-shadow:0 0 16px rgba(255,180,40,.5),inset 0 2px 4px rgba(255,255,255,.4);
  color:#3a1a00;}
.xpbar-lvNum{font-weight:800;font-size:18px;line-height:.9;}
.xpbar-lvLbl{font-size:7px;font-weight:800;letter-spacing:.1em;opacity:.75;}
.xpbar-body{flex:1;min-width:0;}
.xpbar-top{display:flex;justify-content:space-between;align-items:baseline;
  margin-bottom:5px;gap:8px;}
.xpbar-title{font-size:12px;font-weight:800;color:#fff;white-space:nowrap;}
.xpbar-nums{font-size:10px;color:#c7a8e8;font-weight:600;white-space:nowrap;}
.xpbar-track{height:12px;border-radius:7px;background:rgba(0,0,0,.35);
  overflow:hidden;border:1px solid rgba(170,120,255,.25);}
.xpbar-fill{height:100%;border-radius:7px;
  background:linear-gradient(90deg,#9a4ad0,#ff4d9a 55%,#ffd23d);
  box-shadow:0 0 12px rgba(255,120,200,.6);
  transition:width 1.1s cubic-bezier(.25,1,.35,1);
  min-width:6px;}
@media(max-width:520px){
  .xpbar-wrap{max-width:none;width:100%;order:5;margin-top:8px;}
}
`;
