"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Star,
  Trophy,
} from "lucide-react";

export type GameType = "ballmatch" | "neural_cascade";

interface GameResult {
  win: boolean;
  stars: number;
  xp: number;
  level: number;
  score?: number;
}

interface Props {
  game: GameType | null;
  nodeId: string | null;
  level: number;
  onClose: () => void;
  onComplete: (r: GameResult) => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

type SaveSummary = {
  stars: number;
  xpAwarded: number;
  bestScore: number;
  firstCompletion: boolean;
  runValidated: boolean;
};

type StartState = "idle" | "starting" | "ready" | "error";

type SecureRun = {
  id: string;
  token: string;
  expiresAt: string | null;
};

const PATHS: Record<GameType, string> = {
  ballmatch: "/games/ballmatch.html",
  neural_cascade: "/games/neural-cascade.html",
};

const GAME_META: Record<GameType, { title: string; detail: string }> = {
  ballmatch: {
    title: "Ball Match",
    detail: "Completa el objetivo y gana estrellas para avanzar.",
  },
  neural_cascade: {
    title: "Neural Cascade",
    detail: "Conecta la red y supera el boss del mapa.",
  },
};

const IS_DEV = process.env.NODE_ENV === "development";

function boundedInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function normalizeResult(data: Record<string, unknown>, fallbackLevel: number): GameResult {
  const stars = boundedInt(data.stars, 0, 0, 3);
  const xp = boundedInt(data.xp, 0, 0, 10000);
  const score = boundedInt(data.score, 0, 0, 5_000_000);

  return {
    win: Boolean(data.win),
    stars,
    xp,
    score,
    level: boundedInt(data.level, fallbackLevel, 1, 500),
  };
}

export default function GameOverlay({
  game,
  nodeId,
  level,
  onClose,
  onComplete,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [sessionId, setSessionId] = useState(0);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveSummary, setSaveSummary] = useState<SaveSummary | null>(null);
  const [startState, setStartState] = useState<StartState>("idle");
  const [startError, setStartError] = useState<string | null>(null);
  const [secureRun, setSecureRun] = useState<SecureRun | null>(null);
  const [startNonce, setStartNonce] = useState(0);

  const meta = game ? GAME_META[game] : null;
  const frameSrc = useMemo(() => {
    if (!game || !sessionId || startState !== "ready") return "";

    const params = new URLSearchParams({
      level: String(level),
      session: String(sessionId),
    });
    if (secureRun?.id) params.set("run", secureRun.id);

    return `${PATHS[game]}?${params.toString()}`;
  }, [game, level, secureRun?.id, sessionId, startState]);

  useEffect(() => {
    if (!game) return;
    const controller = new AbortController();
    let cancelled = false;

    setFrameLoaded(false);
    setResult(null);
    setSaveSummary(null);
    setSaveState("idle");
    setSecureRun(null);
    setStartError(null);
    setSessionId(0);

    if (!nodeId) {
      setStartState("error");
      setStartError("No hay un nodo de mundo asociado a esta partida.");
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    setStartState("starting");

    async function startRun() {
      try {
        const res = await fetch("/api/world/start-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ node_id: nodeId, game }),
          signal: controller.signal,
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || payload?.error || !payload?.ok) {
          throw new Error(String(payload?.error ?? "run_start_failed"));
        }

        if (cancelled) return;

        const runId = typeof payload.run_id === "string" ? payload.run_id : "";
        const runToken = typeof payload.run_token === "string" ? payload.run_token : "";
        setSecureRun(
          runId && runToken
            ? {
                id: runId,
                token: runToken,
                expiresAt: typeof payload.expires_at === "string" ? payload.expires_at : null,
              }
            : null
        );
        setStartState("ready");
        setSessionId(Date.now());
      } catch (error) {
        if ((error as any)?.name === "AbortError" || cancelled) return;
        console.warn("World game run start failed", error);
        const code = error instanceof Error ? error.message : "run_start_failed";
        setStartState("error");
        setStartError(
          IS_DEV
            ? `No se pudo crear la partida (${code}). Revisa la conexión y vuelve a intentarlo.`
            : "No se pudo crear la partida. Revisa la conexión y vuelve a intentarlo."
        );
      }
    }

    startRun();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [game, level, nodeId, startNonce]);

  const persistResult = useCallback(
    async (nextResult: GameResult) => {
      if (!game || !nodeId || !nextResult.win) return true;

      setSaveState("saving");
      try {
        const res = await fetch("/api/world/complete-node", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            node_id: nodeId,
            stars: nextResult.stars,
            score: nextResult.score ?? 0,
            level: nextResult.level,
            game,
            ...(secureRun
              ? {
                  run_id: secureRun.id,
                  run_token: secureRun.token,
                }
              : {}),
          }),
        });
        const payload = await res.json().catch(() => null);
        if (!res.ok || payload?.error) {
          console.warn("World progress save failed", payload?.error ?? res.statusText);
          setSaveState("error");
          return false;
        }
        setSaveSummary({
          stars: Math.max(0, Math.min(3, Number(payload?.stars ?? nextResult.stars))),
          xpAwarded: Math.max(0, Number(payload?.xp_awarded ?? 0)),
          bestScore: Math.max(0, Number(payload?.best_score ?? nextResult.score ?? 0)),
          firstCompletion: Boolean(payload?.completed_first_time),
          runValidated: Boolean(payload?.run_validated),
        });
        setSaveState("saved");
        return true;
      } catch (error) {
        console.error(error);
        setSaveState("error");
        return false;
      }
    },
    [game, nodeId, secureRun]
  );

  useEffect(() => {
    if (!game || startState !== "ready") return;

    async function onMessage(event: MessageEvent) {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow || event.source !== frameWindow) return;
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== "object") return;

      const data = event.data as Record<string, unknown>;
      if (data.type === "BB_GAME_EXIT") {
        onClose();
        return;
      }

      if (data.type !== "BB_GAME_RESULT") return;

      const nextResult = normalizeResult(data, level);
      setResult(nextResult);

      if (nextResult.win) {
        await persistResult(nextResult);
      } else {
        setSaveState("idle");
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [game, level, onClose, persistResult, startState]);

  useEffect(() => {
    if (!game) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && saveState !== "saving") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game, onClose, saveState]);

  const retryGame = useCallback(() => {
    setFrameLoaded(false);
    setResult(null);
    setSaveSummary(null);
    setSaveState("idle");
    setSecureRun(null);
    setStartError(null);
    setStartState("starting");
    setSessionId(0);
    setStartNonce((value) => value + 1);
  }, []);

  const continueToMap = useCallback(() => {
    if (!result) return;
    onComplete({
      ...result,
      stars: saveSummary?.stars ?? result.stars,
      xp: saveSummary?.xpAwarded ?? result.xp,
      score: saveSummary?.bestScore ?? result.score,
    });
  }, [onComplete, result, saveSummary]);

  if (!game || !meta) return null;

  const isSaving = saveState === "saving";
  const isSaved = saveState === "saved";
  const hasSaveError = saveState === "error";
  const isPreparing = startState === "idle" || startState === "starting";
  const hasStartError = startState === "error";
  const shownXp = saveSummary?.xpAwarded ?? result?.xp ?? 0;
  const shownScore = saveSummary?.bestScore ?? result?.score ?? 0;
  const statusClass = hasStartError ? "error" : isPreparing ? "saving" : saveState;

  return (
    <div
      className="go-shell"
      data-node-id={nodeId ?? ""}
      data-game={game}
      role="dialog"
      aria-modal="true"
      aria-label={`${meta.title} nivel ${level}`}
    >
      <style>{GAME_OVERLAY_CSS}</style>

      <div className="go-topbar">
        <button className="go-back" type="button" onClick={onClose} disabled={isSaving} aria-label="Volver al mapa">
          <ChevronLeft size={22} strokeWidth={2.8} aria-hidden="true" />
        </button>
        <div className="go-titleBlock">
          <strong>{meta.title}</strong>
          <span>Nivel {level}</span>
        </div>
        <div className={`go-status ${statusClass}`} role="status" aria-live="polite">
          {isSaving || isPreparing ? <Loader2 size={15} aria-hidden="true" /> : null}
          {isSaved ? <ShieldCheck size={15} aria-hidden="true" /> : null}
          {hasSaveError || hasStartError ? <AlertTriangle size={15} aria-hidden="true" /> : null}
          <span>
            {isPreparing
              ? "Preparando"
              : isSaving
                ? "Guardando"
                : isSaved
                  ? "Validado"
                  : hasSaveError || hasStartError
                    ? "Revisar"
                    : "Jugando"}
          </span>
        </div>
      </div>

      <div className="go-frameWrap">
        {(isPreparing || (!frameLoaded && frameSrc)) && (
          <div className="go-loading" role="status" aria-live="polite">
            <div className="go-loadingMark">BB</div>
            <strong>{isPreparing ? "Creando partida segura" : `Entrando a ${meta.title}`}</strong>
            <span>{isPreparing ? "Validamos el nodo antes de abrir el minijuego." : meta.detail}</span>
            <i />
          </div>
        )}
        {hasStartError && (
          <div className="go-startIssue" role="alert">
            <div className="go-resultIcon" aria-hidden="true">
              <AlertTriangle size={25} strokeWidth={2.4} />
            </div>
            <div className="go-resultCopy">
              <strong>Partida no iniciada</strong>
              <span>{startError ?? "No se pudo preparar el minijuego."}</span>
            </div>
            <div className="go-actions">
              <button className="go-secondary" type="button" onClick={onClose}>
                Volver al mapa
              </button>
              <button className="go-primary" type="button" onClick={retryGame}>
                <RotateCcw size={18} aria-hidden="true" />
                Reintentar conexión
              </button>
            </div>
          </div>
        )}
        {frameSrc ? (
          <iframe
            ref={iframeRef}
            src={frameSrc}
            className="go-frame"
            allow="autoplay; fullscreen"
            title={`${meta.title} nivel ${level}`}
            onLoad={() => setFrameLoaded(true)}
          />
        ) : null}
      </div>

      {result && (
        <div className="go-resultLayer" role="status" aria-live="polite">
          <div className={`go-resultCard ${result.win ? "win" : "loss"}`}>
            <div className="go-resultIcon" aria-hidden="true">
              {result.win ? <Trophy size={25} strokeWidth={2.4} /> : <RotateCcw size={25} strokeWidth={2.4} />}
            </div>
            <div className="go-resultCopy">
              <strong>{result.win ? "Nivel completado" : "Buen intento"}</strong>
              <span>
                {hasSaveError
                  ? "El juego terminó, pero el avance no se guardó."
                  : result.win
                    ? saveSummary?.firstCompletion === false
                      ? "Resultado validado. Este nivel ya estaba completado."
                      : saveSummary?.runValidated
                        ? "Partida y resultado validados por el servidor."
                        : "Resultado validado por el servidor."
                    : "Puedes reintentar este nivel sin salir del mundo."}
              </span>
            </div>

            <div className="go-stars" aria-label={`${result.stars} de 3 estrellas`}>
              {[0, 1, 2].map((index) => (
                <Star
                  key={index}
                  size={30}
                  strokeWidth={2.2}
                  fill={index < result.stars ? "currentColor" : "none"}
                  className={index < result.stars ? "on" : ""}
                  aria-hidden="true"
                />
              ))}
            </div>

            <div className="go-resultStats">
              <span>
                <b>{shownXp}</b>
                XP validada
              </span>
              <span>
                <b>{Math.round(shownScore).toLocaleString("en-US")}</b>
                puntos
              </span>
            </div>

            {isSaving && (
              <div className="go-saveLine">
                <Loader2 size={16} aria-hidden="true" />
                Sincronizando con Miami Nights
              </div>
            )}

            <div className="go-actions">
              {hasSaveError ? (
                <>
                  <button className="go-secondary" type="button" onClick={onClose}>
                    Salir
                  </button>
                  <button className="go-primary" type="button" onClick={() => persistResult(result)}>
                    Reintentar guardado
                  </button>
                </>
              ) : result.win ? (
                <button className="go-primary" type="button" onClick={continueToMap} disabled={!isSaved}>
                  {isSaved ? (
                    <>
                      <CheckCircle2 size={18} aria-hidden="true" />
                      Continuar al mapa
                    </>
                  ) : (
                    "Preparando mapa"
                  )}
                </button>
              ) : (
                <>
                  <button className="go-secondary" type="button" onClick={onClose}>
                    Volver al mapa
                  </button>
                  <button className="go-primary" type="button" onClick={retryGame}>
                    <RotateCcw size={18} aria-hidden="true" />
                    Reintentar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const GAME_OVERLAY_CSS = `
.go-shell{
  position:fixed;inset:0;z-index:1000;display:grid;grid-template-rows:auto minmax(0,1fr);
  background:#06010d;color:#fff;font-family:var(--font-sans,system-ui,sans-serif);
  overscroll-behavior:contain;
}
.go-topbar{
  min-height:64px;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 8px;
  display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:10px;
  background:linear-gradient(180deg,rgba(6,1,13,.98),rgba(12,5,32,.94));
  border-bottom:1px solid rgba(255,255,255,.1);
}
.go-back,.go-primary,.go-secondary{
  font:inherit;cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,opacity .18s ease;
}
.go-back{
  width:42px;height:42px;border-radius:999px;border:1px solid rgba(255,255,255,.18);
  display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);color:#fff;
}
.go-back:hover{border-color:rgba(255,217,61,.62);background:rgba(255,255,255,.1);}
.go-back:active,.go-primary:active,.go-secondary:active{transform:translateY(1px);}
.go-back:disabled,.go-primary:disabled{opacity:.55;cursor:default;}
.go-back:focus-visible,.go-primary:focus-visible,.go-secondary:focus-visible{
  outline:3px solid rgba(0,229,255,.9);outline-offset:3px;
}
.go-titleBlock{min-width:0;display:flex;flex-direction:column;gap:2px;}
.go-titleBlock strong{font-size:17px;font-weight:950;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.go-titleBlock span{font-size:12px;font-weight:800;color:rgba(222,215,255,.74);}
.go-status{
  min-width:92px;height:34px;border-radius:999px;border:1px solid rgba(255,255,255,.14);
  display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 12px;
  background:rgba(255,255,255,.06);color:rgba(245,240,255,.82);font-size:12px;font-weight:850;
}
.go-status.saving{color:#ffe68a;border-color:rgba(255,217,61,.42);}
.go-status.saved{color:#95ffbf;border-color:rgba(0,230,118,.42);}
.go-status.error{color:#ffb8c8;border-color:rgba(255,61,127,.48);}
.go-status.saving svg,.go-saveLine svg{animation:goSpin .9s linear infinite;}
.go-frameWrap{position:relative;min-height:0;background:#08080c;overflow:hidden;}
.go-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#08080c;}
.go-loading{
  position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:10px;text-align:center;padding:28px;background:
    radial-gradient(circle at 50% 16%,rgba(255,61,127,.23),transparent 36%),
    radial-gradient(circle at 85% 78%,rgba(0,229,255,.14),transparent 42%),
    #06010d;
}
.go-loadingMark{
  width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#ff3d7f,#ffd93d 54%,#00e5ff);color:#090413;
  font-size:20px;font-weight:1000;box-shadow:0 16px 36px rgba(0,0,0,.45);
}
.go-loading strong{font-size:20px;font-weight:950;}
.go-loading span{max-width:310px;color:rgba(245,240,255,.72);font-size:14px;font-weight:650;line-height:1.35;}
.go-loading i{
  width:min(240px,72vw);height:6px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.12);
}
.go-loading i:before{
  content:"";display:block;width:44%;height:100%;border-radius:inherit;
  background:linear-gradient(90deg,#00e5ff,#ffd93d,#ff3d7f);animation:goLoad 1.05s ease-in-out infinite;
}
.go-startIssue{
  position:absolute;left:50%;top:50%;z-index:4;width:min(430px,calc(100% - 28px));transform:translate(-50%,-50%);
  border-radius:16px;padding:18px;background:linear-gradient(180deg,rgba(25,12,58,.98),rgba(8,3,24,.98));
  border:1px solid rgba(255,255,255,.16);box-shadow:0 22px 48px rgba(0,0,0,.56);
}
.go-startIssue .go-resultIcon{color:#ffb8c8;}
.go-startIssue .go-actions{margin-top:16px;}
.go-resultLayer{
  position:absolute;inset:0;z-index:5;display:flex;align-items:flex-end;justify-content:center;
  padding:18px 14px calc(env(safe-area-inset-bottom,0px) + 18px);
  background:linear-gradient(180deg,rgba(3,0,10,.2),rgba(3,0,10,.84));
}
.go-resultCard{
  width:min(430px,100%);border-radius:16px;padding:18px;
  background:linear-gradient(180deg,rgba(25,12,58,.98),rgba(8,3,24,.98));
  border:1px solid rgba(255,255,255,.16);box-shadow:0 22px 48px rgba(0,0,0,.56);
  animation:goResultIn .22s ease-out;
}
.go-resultIcon{
  width:48px;height:48px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#ffd93d;
}
.go-resultCard.loss .go-resultIcon{color:#ff7fb0;}
.go-resultCopy strong{display:block;font-size:22px;font-weight:1000;line-height:1.05;}
.go-resultCopy span{display:block;margin-top:5px;color:rgba(238,232,255,.72);font-size:14px;font-weight:650;line-height:1.4;}
.go-stars{display:flex;gap:8px;margin:16px 0 12px;color:rgba(255,255,255,.26);}
.go-stars .on{color:#ffd93d;filter:drop-shadow(0 0 9px rgba(255,217,61,.78));animation:goStar .34s ease-out;}
.go-resultStats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;}
.go-resultStats span{
  min-height:54px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  color:rgba(238,232,255,.68);font-size:11px;font-weight:850;
}
.go-resultStats b{color:#fff;font-size:18px;font-weight:1000;}
.go-saveLine{
  min-height:34px;border-radius:12px;margin-bottom:12px;display:flex;align-items:center;justify-content:center;gap:8px;
  background:rgba(255,217,61,.08);border:1px solid rgba(255,217,61,.18);color:#ffe68a;font-size:13px;font-weight:850;
}
.go-actions{display:flex;gap:10px;}
.go-primary,.go-secondary{
  min-height:46px;border-radius:999px;padding:0 18px;display:inline-flex;align-items:center;justify-content:center;gap:8px;
  border:1px solid transparent;font-size:14px;font-weight:900;
}
.go-primary{
  flex:1.25;background:linear-gradient(180deg,#fff07f 0%,#ffc21e 50%,#cb7808 100%);
  color:#321500;border-color:#fff0ad;box-shadow:0 10px 26px rgba(0,0,0,.34),0 0 18px rgba(255,199,42,.42);
}
.go-secondary{
  flex:1;background:rgba(255,255,255,.07);color:#fff;border-color:rgba(255,255,255,.14);
}
@keyframes goSpin{to{transform:rotate(360deg)}}
@keyframes goLoad{0%{transform:translateX(-115%)}100%{transform:translateX(250%)}}
@keyframes goResultIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes goStar{0%{transform:scale(.65) rotate(-12deg)}70%{transform:scale(1.18)}100%{transform:scale(1)}}
@media(max-width:560px){
  .go-topbar{grid-template-columns:42px minmax(0,1fr) auto;padding-left:10px;padding-right:10px;}
  .go-status{min-width:78px;padding:0 9px;font-size:11px;}
  .go-titleBlock strong{font-size:15px;}
  .go-resultLayer{padding-left:10px;padding-right:10px;}
  .go-resultCard{padding:16px;}
  .go-actions{flex-direction:column-reverse;}
  .go-primary,.go-secondary{width:100%;flex:auto;}
}
@media(prefers-reduced-motion:reduce){
  .go-status.saving svg,.go-saveLine svg,.go-loading i:before,.go-stars .on,.go-resultCard{animation:none!important;}
  .go-back,.go-primary,.go-secondary{transition:none!important;}
}
`;
