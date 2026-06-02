import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "../api";
import { WORLDS_BY_ID, gameTypeForLevel, GAME_LABEL } from "../data/worlds";
import { ArrowLeft, Star, RotateCw, ChevronRight, Trophy } from "lucide-react";
import Match3 from "../games/Match3";
import Memory from "../games/Memory";
import Slide from "../games/Slide";
import WordSearch from "../games/WordSearch";

export default function GamePage() {
  const { worldId, level } = useParams();
  const lvl = parseInt(level, 10);
  const theme = WORLDS_BY_ID[worldId];
  const type = gameTypeForLevel(lvl);
  const nav = useNavigate();

  const [result, setResult] = useState(null); // { stars, score, moves, time_seconds, win }
  const [saved, setSaved] = useState(null); // server response
  const [savingError, setSavingError] = useState("");
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => { setResult(null); setSaved(null); setResetKey((k)=>k+1); }, [worldId, lvl]);

  const onComplete = async (r) => {
    setResult(r);
    if (r.win) {
      try {
        const { data } = await api.post("/progress/complete", {
          world_id: worldId, level: lvl, stars: r.stars, score: r.score, moves: r.moves, time_seconds: r.time_seconds,
        });
        setSaved(data);
      } catch (e) {
        const d = e.response?.data?.detail;
        setSavingError(typeof d === "string" ? d : "No se pudo guardar progreso");
      }
    }
  };

  const next = () => {
    if (lvl < 20) nav(`/world/${worldId}/level/${lvl + 1}`);
    else nav(`/world/${worldId}`);
  };

  if (!theme) return <div className="phone p-6">Mundo desconocido</div>;

  const GameComp = { match3: Match3, memory: Memory, slide: Slide, wordsearch: WordSearch }[type];

  return (
    <div className="phone relative flex flex-col" data-testid={`game-page-${worldId}-${lvl}`} style={{ background: `linear-gradient(180deg, rgba(9,9,11,1) 0%, ${theme.primary}22 50%, rgba(9,9,11,1) 100%)` }}>
      <header className="px-5 pt-5 flex items-center gap-3">
        <button onClick={() => nav(`/world/${worldId}`)} data-testid="back-to-level-map-btn" className="w-10 h-10 rounded-full bg-white/10 border border-white/10 grid place-items-center">
          <ArrowLeft size={18}/>
        </button>
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: theme.primary }}>{theme.name} · Nivel {lvl}</div>
          <h1 className="h-display text-xl font-black leading-none">{GAME_LABEL[type]}</h1>
        </div>
        <button onClick={() => setResetKey((k)=>k+1)} data-testid="restart-game-btn" className="ml-auto w-10 h-10 rounded-full bg-white/10 border border-white/10 grid place-items-center" aria-label="Reiniciar">
          <RotateCw size={16}/>
        </button>
      </header>

      <div className="flex-1 px-4 pt-4 pb-4 overflow-hidden">
        <GameComp key={resetKey} level={lvl} theme={theme} onComplete={onComplete} />
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-6"
            data-testid="game-result-modal"
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: .9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }}
              className="glass-card p-7 w-full max-w-sm text-center"
              style={{ borderColor: result.win ? theme.primary + "55" : "rgba(255,255,255,.1)" }}
            >
              {result.win ? (
                <>
                  <Trophy size={42} className="mx-auto" style={{ color: theme.primary }}/>
                  <div className="h-display text-3xl font-black mt-2">¡Nivel completado!</div>
                  <div className="flex items-center justify-center gap-1 mt-4">
                    {[1,2,3].map((s) => (
                      <Star key={s} size={36} className={s <= result.stars ? "fill-[#FFD700] text-[#FFD700] pop" : "text-zinc-700"} style={{ animationDelay: `${s * 0.12}s` }}/>
                    ))}
                  </div>
                  <div className="text-zinc-300 mt-3 text-sm">
                    Puntos: <b className="text-white">{result.score}</b>
                    {result.time_seconds ? <> · Tiempo: <b className="text-white">{result.time_seconds}s</b></> : null}
                  </div>
                  {saved?.newly_unlocked?.length > 0 && (
                    <div data-testid="newly-unlocked-banner" className="mt-4 text-sm font-bold rounded-xl py-2.5 px-3" style={{ background: theme.primary + "22", color: theme.primary }}>
                      🌟 ¡Desbloqueaste {saved.newly_unlocked.map(w=>w.name).join(", ")}!
                    </div>
                  )}
                  {savingError && <div className="mt-3 text-red-400 text-xs">{savingError}</div>}
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button onClick={() => { setResult(null); setResetKey((k)=>k+1); }} data-testid="replay-btn" className="btn btn-ghost">Repetir</button>
                    <button onClick={next} data-testid="next-level-btn" className="btn btn-primary">{lvl < 20 ? "Siguiente" : "Finalizar"} <ChevronRight size={18}/></button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl">💥</div>
                  <div className="h-display text-2xl font-black mt-2">¡Sigue intentando!</div>
                  <div className="text-zinc-300 mt-1 text-sm">No alcanzaste el objetivo.</div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button onClick={() => nav(`/world/${worldId}`)} data-testid="give-up-btn" className="btn btn-ghost">Volver</button>
                    <button onClick={() => { setResult(null); setResetKey((k)=>k+1); }} data-testid="retry-btn" className="btn btn-primary">Reintentar</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
