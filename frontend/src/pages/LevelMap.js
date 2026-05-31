import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";
import { WORLDS_BY_ID, GAME_LABEL } from "../data/worlds";
import { ArrowLeft, Lock, Star, Check } from "lucide-react";

const NODE_SIZE = 68;
const ROW_HEIGHT = 110;

export default function LevelMapPage() {
  const { worldId } = useParams();
  const nav = useNavigate();
  const theme = WORLDS_BY_ID[worldId];
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    let alive = true;
    api.get(`/worlds/${worldId}/levels`).then(({ data }) => alive && setData(data)).catch((e) => {
      const d = e.response?.data?.detail;
      setError(typeof d === "string" ? d : "Error al cargar niveles");
    });
    return () => { alive = false; };
  }, [worldId]);

  useEffect(() => {
    // Auto-scroll to current level
    if (data && scrollRef.current) {
      const currentIndex = data.levels.findIndex((l) => l.unlocked && !l.completed);
      if (currentIndex > 0) scrollRef.current.scrollTop = Math.max(0, currentIndex * ROW_HEIGHT - 250);
    }
  }, [data]);

  if (!theme) return <div className="phone p-6">Mundo desconocido</div>;

  return (
    <div className="phone relative flex flex-col" data-testid={`level-map-${worldId}`}>
      <div className="absolute inset-0">
        <img src={theme.bg} alt="" className="w-full h-full object-cover opacity-25"/>
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(9,9,11,.4) 0%, rgba(9,9,11,.92) 60%)` }}/>
      </div>

      <header className="relative px-5 pt-5 flex items-center gap-3">
        <button onClick={() => nav(-1)} data-testid="back-to-worlds-btn" className="w-10 h-10 rounded-full bg-white/10 border border-white/10 grid place-items-center">
          <ArrowLeft size={18}/>
        </button>
        <div>
          <div className="text-xs uppercase tracking-widest font-bold" style={{ color: theme.primary }}>Mundo {theme.ordinal}</div>
          <h1 className="h-display text-2xl font-black leading-none">{theme.name}</h1>
        </div>
        <div className="ml-auto flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full bg-white/10 border border-white/10">
          <Star size={14} className="fill-[#FFD700] text-[#FFD700]"/>
          <span data-testid="world-stars-count">{data ? data.levels.reduce((a,l)=>a+l.stars,0) : 0}/{(data?.levels.length || 20) * 3}</span>
        </div>
      </header>

      {error && <div className="relative px-5 mt-4 text-red-400 text-sm" data-testid="level-map-error">{error}</div>}

      <div ref={scrollRef} className="relative flex-1 overflow-y-auto scrollbar-hide pt-4 pb-10">
        <div className="relative mx-auto" style={{ width: 260, height: (data?.levels.length || 20) * ROW_HEIGHT + 40 }}>
          {/* SVG winding path */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`path-${worldId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.primary} stopOpacity="0.9"/>
                <stop offset="100%" stopColor={theme.secondary} stopOpacity="0.5"/>
              </linearGradient>
            </defs>
            {data?.levels.map((_, idx) => {
              if (idx === data.levels.length - 1) return null;
              const x1 = idx % 2 === 0 ? 70 : 190;
              const x2 = (idx + 1) % 2 === 0 ? 70 : 190;
              const y1 = idx * ROW_HEIGHT + NODE_SIZE / 2 + 20;
              const y2 = (idx + 1) * ROW_HEIGHT + NODE_SIZE / 2 + 20;
              const cx = (x1 + x2) / 2 + (idx % 2 === 0 ? 60 : -60);
              const cy = (y1 + y2) / 2;
              return (
                <path key={idx} d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} stroke={`url(#path-${worldId})`} strokeWidth="3" fill="none" strokeDasharray="6 8" strokeLinecap="round" opacity="0.75"/>
              );
            })}
          </svg>

          {data?.levels.map((lvl, idx) => {
            const x = idx % 2 === 0 ? 70 : 190;
            const y = idx * ROW_HEIGHT + 20;
            const isCurrent = lvl.unlocked && !lvl.completed;
            const onClick = () => lvl.unlocked && nav(`/world/${worldId}/level/${lvl.level}`);
            return (
              <motion.button
                key={lvl.level}
                onClick={onClick}
                disabled={!lvl.unlocked}
                data-testid={`level-node-${worldId}-${lvl.level}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.025, type: "spring", stiffness: 200, damping: 14 }}
                whileTap={lvl.unlocked ? { scale: 0.9 } : {}}
                className="absolute grid place-items-center"
                style={{
                  left: x - NODE_SIZE / 2, top: y,
                  width: NODE_SIZE, height: NODE_SIZE,
                  borderRadius: 9999,
                  border: `3px solid ${isCurrent ? "#fff" : "rgba(255,255,255,0.5)"}`,
                  background: lvl.unlocked
                    ? `radial-gradient(circle at 30% 25%, ${theme.primary}, ${theme.secondary})`
                    : "rgba(24,24,27,0.85)",
                  boxShadow: isCurrent ? `0 0 28px ${theme.primary}` : "0 8px 18px rgba(0,0,0,.45)",
                  cursor: lvl.unlocked ? "pointer" : "default",
                }}
              >
                {!lvl.unlocked ? (
                  <Lock size={20} className="text-zinc-300"/>
                ) : lvl.completed ? (
                  <Check size={26} className="text-white drop-shadow"/>
                ) : (
                  <span className="h-display font-black text-xl text-white drop-shadow">{lvl.level}</span>
                )}

                {/* Stars below */}
                {lvl.completed && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {[1,2,3].map((s) => (
                      <Star key={s} size={10} className={s <= lvl.stars ? "fill-[#FFD700] text-[#FFD700]" : "text-zinc-600"}/>
                    ))}
                  </div>
                )}
                {/* Level type badge */}
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] uppercase tracking-wider text-zinc-300 font-bold bg-black/50 px-1.5 py-0.5 rounded">
                  {GAME_LABEL[lvl.game_type]}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
