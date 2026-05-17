"use client";

import { useRouter } from "next/navigation";

export default function BallMatchClient({ level }: { level: number }) {
  const router = useRouter();

  return (
    <div style={{ position:"fixed", inset:0, background:"#08080C", zIndex:50 }}>
      <button
        onClick={() => router.push("/mundo")}
        style={{
          position:"absolute", top:"env(safe-area-inset-top, 12px)", left:12,
          zIndex:60, background:"rgba(20,8,40,.92)", border:"1.5px solid rgba(255,200,90,.4)",
          borderRadius:14, color:"#FFD98A", fontFamily:"'Fredoka',system-ui",
          fontWeight:700, fontSize:13, padding:"8px 14px", cursor:"pointer",
          backdropFilter:"blur(6px)", boxShadow:"0 4px 12px rgba(0,0,0,.5)",
        }}
      >
        ← Mundo
      </button>
      <iframe
        src={`/ballmatch/index.html?level=${level}`}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", border:"none" }}
        allow="autoplay"
        title={`Ball Match — Nivel ${level}`}
      />
    </div>
  );
}
