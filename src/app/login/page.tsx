"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/* BingoBolla — LOGIN  ·  src/app/login/page.tsx
   Email + contraseña con Supabase auth */

export default function Login() {
  const [mode, setMode] = useState<"in"|"up">("in");
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [name, setName]   = useState("");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      const sb = createClient();
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        window.location.href = "/lobby";
      } else {
        const { error } = await sb.auth.signUp({
          email, password: pass,
          options: { data: { display_name: name || email.split("@")[0] } },
        });
        if (error) throw error;
        window.location.href = "/lobby";
      }
    } catch (e: any) {
      setErr(e?.message || "Algo salió mal. Inténtalo de nuevo.");
    } finally { setBusy(false); }
  };

  return (
    <div className="bb">
      <div className="bb-bg" aria-hidden><i className="g1"/><i className="g2"/><i className="g3"/></div>

      <div className="balls" aria-hidden>
        {["B7","I22","N41","G58","O73","B12"].map((b,i)=>
          <div key={b} className={`ball x${i}`}><span>{b}</span></div>)}
      </div>

      <main className="card">
        <a href="/" className="logo"><b>BINGO</b><em>BOLLA</em></a>
        <p className="tag">PLAY · WIN · BELONG</p>

        <form onSubmit={(event)=>{event.preventDefault();void submit();}}>
          <div className="tabs">
            <button type="button" className={mode==="in"?"on":""}  onClick={()=>{setMode("in");setErr("")}}>Entrar</button>
            <button type="button" className={mode==="up"?"on":""}  onClick={()=>{setMode("up");setErr("")}}>Crear cuenta</button>
          </div>

          {mode==="up" && (
            <label className="fld">
              <span>Nombre de jugador</span>
              <input value={name} onChange={e=>setName(e.target.value)}
                placeholder="BingoStar" autoComplete="nickname"/>
            </label>
          )}
          <label className="fld">
            <span>Email</span>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="tu@email.com" autoComplete="email"/>
          </label>
          <label className="fld">
            <span>Contraseña</span>
            <input type="password" value={pass} onChange={e=>setPass(e.target.value)}
              placeholder="••••••••" autoComplete={mode==="in"?"current-password":"new-password"}/>
          </label>

          {err && <div className="err">{err}</div>}

          <button className="btn gold" type="submit" disabled={busy}>
            {busy ? "Un momento…" : mode==="in" ? "ENTRAR A JUGAR →" : "CREAR CUENTA →"}
          </button>
        </form>

        {mode==="in" && <a href="/reset" className="forgot">¿Olvidaste tu contraseña?</a>}

        <p className="legal">
          Al continuar aceptas jugar de forma responsable. Solo +18.
          BingoBolla opera bajo modelo sweepstakes — sin compra necesaria.
        </p>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Hanken+Grotesk:wght@400;500;600&display=swap');
        .bb{--bg2:#0C0418;--gold:#FFB323;--gold2:#FFD55E;--vio:#7B2FF7;--vio2:#A45BFF;
          --pink:#FF4D9A;--cyan:#3DE8FF;--live:#FF3B5C;--ink:#fff;--mut:rgba(255,255,255,.6);
          position:relative;min-height:100vh;background:var(--bg2);color:var(--ink);
          font-family:'Hanken Grotesk',sans-serif;display:grid;place-items:center;
          padding:24px;overflow:hidden}
        .bb *{box-sizing:border-box;margin:0;padding:0}
        .bb a{color:inherit;text-decoration:none}
        .bb-bg{position:fixed;inset:0;z-index:0;
          background:radial-gradient(130% 90% at 50% 0%,#3a1260,#1B0A33 48%,var(--bg2) 82%)}
        .bb-bg i{position:absolute;border-radius:50%;filter:blur(80px);opacity:.4}
        .g1{width:460px;height:460px;background:var(--vio);top:-130px;left:-110px}
        .g2{width:400px;height:400px;background:var(--pink);bottom:-140px;right:-120px;opacity:.28}
        .g3{width:480px;height:480px;background:#5a1a8a;top:30%;left:40%;opacity:.25}
        .balls{position:fixed;inset:0;z-index:1;pointer-events:none}
        .ball{position:absolute;width:58px;height:58px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-family:'Fredoka',sans-serif;font-weight:700;font-size:14px;color:#3a1e00;
          background:radial-gradient(circle at 32% 28%,#fff,var(--gold2) 35%,var(--gold) 72%);
          box-shadow:0 12px 26px rgba(0,0,0,.5);opacity:.5;
          animation:fl 6s ease-in-out infinite}
        .ball.x0{top:12%;left:10%}
        .ball.x1{top:22%;right:12%;background:radial-gradient(circle at 32% 28%,#fff,#7af0ff 35%,var(--cyan) 72%);animation-delay:.7s}
        .ball.x2{bottom:18%;left:14%;background:radial-gradient(circle at 32% 28%,#fff,#ff9ccb 35%,var(--pink) 72%);animation-delay:1.4s}
        .ball.x3{bottom:12%;right:16%;animation-delay:.4s}
        .ball.x4{top:48%;left:6%;background:radial-gradient(circle at 32% 28%,#fff,#c69bff 35%,var(--vio) 72%);animation-delay:1s}
        .ball.x5{top:60%;right:8%;animation-delay:1.7s}
        @keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
        .card{position:relative;z-index:5;width:100%;max-width:400px;
          padding:38px 32px;border-radius:26px;text-align:center;
          background:linear-gradient(180deg,rgba(40,18,70,.85),rgba(20,8,38,.92));
          border:1px solid rgba(255,255,255,.1);
          box-shadow:0 30px 80px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.08);
          backdrop-filter:blur(16px)}
        .logo{font-family:'Fredoka',sans-serif;font-weight:700;font-size:32px;line-height:1}
        .logo b{color:#fff}.logo em{color:var(--gold);font-style:normal;
          text-shadow:0 0 18px rgba(255,179,35,.6)}
        .tag{font-family:'Fredoka',sans-serif;font-size:11px;font-weight:600;
          letter-spacing:3px;color:var(--mut);margin:6px 0 26px}
        .tabs{display:flex;gap:6px;padding:5px;border-radius:14px;
          background:rgba(0,0,0,.35);margin-bottom:22px}
        .tabs button{flex:1;padding:11px;border:none;border-radius:10px;
          font-family:'Fredoka',sans-serif;font-weight:600;font-size:14px;
          background:transparent;color:var(--mut);cursor:pointer;transition:.2s}
        .tabs button.on{background:linear-gradient(180deg,var(--vio2),var(--vio));
          color:#fff;box-shadow:0 4px 14px rgba(123,47,247,.5)}
        .fld{display:block;text-align:left;margin-bottom:14px}
        .fld span{display:block;font-size:12px;font-weight:600;color:var(--mut);
          margin-bottom:6px;padding-left:4px}
        .fld input{width:100%;padding:14px 16px;border-radius:13px;
          background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);
          color:#fff;font-size:15px;font-family:'Hanken Grotesk',sans-serif;outline:none;
          transition:.2s}
        .fld input::placeholder{color:rgba(255,255,255,.3)}
        .fld input:focus{border-color:var(--gold);
          box-shadow:0 0 0 3px rgba(255,179,35,.18)}
        .err{background:rgba(255,59,92,.15);border:1px solid rgba(255,59,92,.4);
          color:#ff9eb0;font-size:13px;padding:10px 14px;border-radius:11px;
          margin-bottom:14px;text-align:left}
        .btn{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;
          padding:16px;border:none;border-radius:14px;cursor:pointer;
          font-family:'Fredoka',sans-serif;font-weight:700;font-size:16px;
          transition:.2s;margin-top:6px}
        .btn.gold{background:linear-gradient(180deg,var(--gold2),var(--gold));
          color:#3a1e00;box-shadow:0 10px 28px rgba(255,179,35,.45),
          inset 0 1px 0 rgba(255,255,255,.6)}
        .btn.gold:hover:not(:disabled){transform:translateY(-2px);
          box-shadow:0 14px 36px rgba(255,179,35,.6)}
        .btn:disabled{opacity:.6;cursor:default}
        .forgot{display:inline-block;margin-top:16px;font-size:13px;color:var(--mut)}
        .forgot:hover{color:var(--gold)}
        .legal{margin-top:22px;font-size:11px;line-height:1.6;
          color:rgba(255,255,255,.38)}
      `}</style>
    </div>
  );
}
