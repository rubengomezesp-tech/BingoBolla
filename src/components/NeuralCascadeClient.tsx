"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle2 } from "lucide-react";

type LocalResult = {
  score: number;
  stars: number;
};

export default function NeuralCascadeClient({ level }: { level: number }) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [result, setResult] = useState<LocalResult | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const frameWindow = iframeRef.current?.contentWindow;
      if (!frameWindow || event.source !== frameWindow) return;
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== "object") return;

      const data = event.data as Record<string, unknown>;
      if (data.type === "BB_GAME_EXIT") {
        router.push("/mundomiami");
        return;
      }
      if (data.type !== "BB_GAME_RESULT") return;

      setResult({
        score: Math.max(0, Number(data.score ?? 0)),
        stars: Math.max(0, Math.min(3, Number(data.stars ?? 0))),
      });
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  return (
    <div className="nc-shell">
      <style>{NEURAL_CASCADE_PAGE_CSS}</style>
      <button
        className="nc-back"
        onClick={() => router.push("/mundomiami")}
        type="button"
        aria-label="Volver al mapa Miami"
      >
        <ChevronLeft size={19} strokeWidth={2.8} aria-hidden="true" />
        Mundo
      </button>
      {result && (
        <div className="nc-result" role="status" aria-live="polite">
          <CheckCircle2 size={17} strokeWidth={2.6} aria-hidden="true" />
          <span>{result.stars}/3 estrellas</span>
          <b>{Math.round(result.score).toLocaleString("en-US")}</b>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={`/games/neural-cascade.html?level=${level}`}
        className="nc-frame"
        allow="autoplay; fullscreen"
        title={`Neural Cascade - Nivel ${level}`}
      />
    </div>
  );
}

const NEURAL_CASCADE_PAGE_CSS = `
.nc-shell{
  position:fixed;inset:0;z-index:50;background:#06010d;color:#fff;
  font-family:var(--font-sans,system-ui,sans-serif);overflow:hidden;
}
.nc-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#06010d;}
.nc-back{
  position:fixed;top:calc(env(safe-area-inset-top,0px) + 12px);left:12px;z-index:70;
  min-height:38px;border:1.5px solid rgba(255,217,61,.42);border-radius:999px;padding:0 13px 0 10px;
  display:inline-flex;align-items:center;gap:5px;background:rgba(18,8,42,.88);color:#ffd98a;
  font:inherit;font-size:13px;font-weight:900;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.46);
  backdrop-filter:blur(10px);
}
.nc-back:hover{border-color:rgba(0,229,255,.62);color:#dffbff;}
.nc-back:focus-visible{outline:3px solid rgba(0,229,255,.9);outline-offset:3px;}
.nc-result{
  position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);z-index:70;
  transform:translateX(-50%);min-height:40px;border-radius:999px;padding:0 14px;
  display:inline-flex;align-items:center;gap:8px;background:linear-gradient(180deg,rgba(255,240,127,.98),rgba(255,172,30,.97));
  color:#321500;border:2px solid rgba(255,255,255,.78);box-shadow:0 12px 28px rgba(0,0,0,.42),0 0 30px rgba(255,213,61,.58);
  font-size:13px;font-weight:1000;white-space:nowrap;
}
.nc-result b{padding-left:2px;}
@media(max-width:560px){
  .nc-back{top:calc(env(safe-area-inset-top,0px) + 8px);left:8px;min-height:34px;font-size:12px;}
  .nc-result{max-width:calc(100vw - 18px);font-size:12px;}
}
`;
