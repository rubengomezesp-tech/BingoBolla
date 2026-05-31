import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { WORLDS_BY_ID } from "../data/worlds";
import { useAuth } from "../AuthContext";
import { LogOut, Star, Lock, ChevronRight, User as UserIcon, Trophy } from "lucide-react";

export default function WorldMapPage() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api.get("/worlds").then(({ data }) => alive && setData(data)).catch(() => alive && setError("Error al cargar mundos"));
    return () => { alive = false; };
  }, []);

  return (
    <div className="phone stars-bg relative flex flex-col" data-testid="world-map-page">
      <header className="flex items-center justify-between px-5 pt-5">
        <Link to="/profile" data-testid="open-profile-btn" className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF2A6D] to-[#C026D3] grid place-items-center text-xs font-black">
            {(user?.name || "U").slice(0,1).toUpperCase()}
          </div>
          <span className="text-sm font-semibold max-w-[110px] truncate">{user?.name}</span>
        </Link>
        <div className="flex items-center gap-2">
          <div data-testid="total-stars-badge" className="px-3 py-2 rounded-full bg-white/5 border border-white/10 flex items-center gap-1.5 text-sm font-bold">
            <Star size={14} className="fill-[#FFD700] text-[#FFD700]"/> {data?.total_stars ?? 0}
          </div>
          <button data-testid="logout-btn" onClick={() => { logout(); nav("/login"); }} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 grid place-items-center" aria-label="Salir">
            <LogOut size={16}/>
          </button>
        </div>
      </header>

      <div className="px-6 mt-4">
        <h1 className="h-display text-3xl font-black leading-tight">
          Tu <span className="bg-gradient-to-r from-[#FF2A6D] via-[#FFD700] to-[#05D9E8] bg-clip-text text-transparent">tour</span> por USA
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Avanza ciudad a ciudad. Gana estrellas para desbloquear.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 mt-5 pb-6 scrollbar-hide space-y-4">
        {error && <div className="text-red-400">{error}</div>}
        <AnimatePresence>
          {data?.worlds?.map((w, i) => {
            const theme = WORLDS_BY_ID[w.id] || {};
            return (
              <motion.div
                key={w.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.06 }}
                whileTap={w.unlocked ? { scale: 0.985 } : {}}
                onClick={() => w.unlocked && nav(`/world/${w.id}`)}
                data-testid={`world-card-${w.id}`}
                className={`relative overflow-hidden rounded-3xl border border-white/10 ${w.unlocked ? "cursor-pointer" : "opacity-70"}`}
                style={{ minHeight: 180 }}
              >
                <img src={theme.bg} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: w.unlocked ? "saturate(1.05)" : "grayscale(.7) brightness(.6)" }}/>
                <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, rgba(9,9,11,.05) 0%, rgba(9,9,11,.85) 100%)` }}/>
                <div className="relative p-5 flex flex-col h-full justify-end min-h-[180px]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest font-bold" style={{ color: theme.primary }}>Mundo {w.ordinal}</span>
                    {!w.unlocked && (
                      <span data-testid={`world-locked-${w.id}`} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-black/50 border border-white/10">
                        <Lock size={10}/> {w.unlock_stars}★ requeridas
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between mt-1">
                    <div>
                      <div className="h-display text-3xl font-black">{w.name}</div>
                      <div className="text-zinc-300 text-sm">{w.subtitle}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end text-sm font-bold">
                        <Star size={14} className="fill-[#FFD700] text-[#FFD700]"/>
                        <span data-testid={`world-stars-${w.id}`}>{w.stars_earned}/{w.stars_max}</span>
                      </div>
                      <div className="text-xs text-zinc-400">{w.levels_completed}/{w.levels_total} niveles</div>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(w.levels_completed / w.levels_total) * 100}%`, background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})` }}/>
                  </div>
                  {w.unlocked && (
                    <div className="mt-3 inline-flex items-center gap-1 text-sm font-bold" style={{ color: theme.secondary }}>
                      Jugar <ChevronRight size={16}/>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!data && !error && (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-44 rounded-3xl bg-white/5 animate-pulse"/>)}
          </div>
        )}
      </div>
    </div>
  );
}
