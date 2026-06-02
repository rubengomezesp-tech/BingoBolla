"use client";
import { useEffect, useState } from "react";

/* ============================================================
   BingoBolla — Home / Landing  (src/app/page.tsx)
   Estética: Miami neon synthwave · case con /mundo
   Autocontenido: solo React + <a> (sin next/navigation ni supabase)
   ============================================================ */

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const GAMES = [
    { tag: "EN VIVO", name: "Bingo Salas", desc: "Cartones en tiempo real con jugadores de todo el mundo. Línea, dos líneas y bingo.", c: "#FF4D9A" },
    { tag: "PUZZLE",  name: "Ball Match", desc: "Empareja bolas, encadena combos y desata el Bolla Fever ×10.", c: "#3DE8FF" },
    { tag: "BOSS",    name: "Neural Cascade", desc: "Reto de enrutado cada 5 niveles. Estrategia pura para subir de nivel.", c: "#C8941A" },
  ];

  const STEPS = [
    { n: "01", t: "Regístrate gratis", d: "Crea tu cuenta en segundos y recibe Gold Coins de bienvenida." },
    { n: "02", t: "Juega y gana", d: "Usa Gold Coins para divertirte o Sweeps Coins para premios reales." },
    { n: "03", t: "Canjea premios", d: "Convierte tus Sweeps Coins en recompensas. Sin comprar nada." },
  ];

  return (
    <div className="bb-root">
      {/* ---------- Fondo synthwave ---------- */}
      <div className="bb-bg" aria-hidden>
        <div className="bb-sky" />
        <div className="bb-sun" />
        <div className="bb-grid" />
        <div className="bb-grain" />
      </div>

      {/* ---------- Nav ---------- */}
      <header className="bb-nav">
        <a href="/" className="bb-logo">BINGOBOLLA</a>
        <nav className="bb-links">
          <a href="/mundo">Mundo</a>
          <a href="#juegos">Juegos</a>
          <a href="#como">Cómo funciona</a>
        </nav>
        <a href="/mundo" className="bb-btn bb-btn-ghost">Entrar</a>
      </header>

      {/* ---------- Hero ---------- */}
      <main className="bb-hero">
        <div className={`bb-hero-in ${mounted ? "on" : ""}`}>
          <span className="bb-eyebrow">SOCIAL CASINO · MIAMI NIGHTS</span>
          <h1 className="bb-h1">
            Juega bingo.<br />
            <span className="bb-h1-glow">Gana premios reales.</span>
          </h1>
          <p className="bb-sub">
            El bingo social más vibrante del mundo. Salas en vivo, juegos arcade
            y un mapa de Miami Beach que se ilumina con cada victoria.
          </p>
          <div className="bb-cta">
            <a href="/mundo" className="bb-btn bb-btn-primary">Jugar gratis →</a>
            <a href="#como" className="bb-btn bb-btn-ghost">Cómo funciona</a>
          </div>
          <div className="bb-trust">
            <span>✓ Sin compra necesaria</span>
            <span>✓ Modelo sweepstakes legal</span>
            <span>✓ Premios canjeables</span>
          </div>
        </div>

        {/* Bolas flotantes */}
        <div className="bb-balls" aria-hidden>
          {["B7","I22","N41","G58","O73"].map((b,i)=>(
            <div key={b} className={`bb-ball b${i}`}><span>{b}</span></div>
          ))}
        </div>
      </main>

      {/* ---------- Monedas ---------- */}
      <section className="bb-coins">
        <div className="bb-coin-card gold">
          <div className="bb-coin-ico">🪙</div>
          <h3>Gold Coins</h3>
          <p>Para jugar por pura diversión. Reponibles cada día, sin coste y sin presión.</p>
        </div>
        <div className="bb-coin-card sweep">
          <div className="bb-coin-ico">💎</div>
          <h3>Sweeps Coins</h3>
          <p>Las ganas jugando o de regalo. Canjéalas por premios reales. Nunca hace falta comprar.</p>
        </div>
      </section>

      {/* ---------- Juegos ---------- */}
      <section id="juegos" className="bb-section">
        <h2 className="bb-h2">Tres formas de ganar</h2>
        <div className="bb-games">
          {GAMES.map(g => (
            <div key={g.name} className="bb-game" style={{ ["--c" as string]: g.c }}>
              <span className="bb-game-tag">{g.tag}</span>
              <h3>{g.name}</h3>
              <p>{g.desc}</p>
              <a href="/mundo" className="bb-game-link">Jugar ahora →</a>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Mundo teaser ---------- */}
      <section className="bb-world">
        <div className="bb-world-in">
          <span className="bb-eyebrow">EL MAPA</span>
          <h2 className="bb-h2">Miami Nights — 20 niveles de neón</h2>
          <p className="bb-sub">
            Recorre Ocean Drive nivel a nivel. Cada parada desbloquea un juego nuevo
            y cada 5 niveles te espera un Boss. Llega hasta la corona.
          </p>
          <a href="/mundo" className="bb-btn bb-btn-primary">Explorar el mundo →</a>
        </div>
      </section>

      {/* ---------- Cómo funciona ---------- */}
      <section id="como" className="bb-section">
        <h2 className="bb-h2">Empieza en 3 pasos</h2>
        <div className="bb-steps">
          {STEPS.map(s => (
            <div key={s.n} className="bb-step">
              <div className="bb-step-n">{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
        <div className="bb-final-cta">
          <a href="/mundo" className="bb-btn bb-btn-primary lg">Crear cuenta gratis →</a>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="bb-foot">
        <div className="bb-foot-top">
          <span className="bb-logo sm">BINGOBOLLA</span>
          <nav className="bb-foot-links">
            <a href="/mundo">Mundo</a>
            <a href="#juegos">Juegos</a>
            <a href="#como">Cómo funciona</a>
            <a href="/tienda">Tienda</a>
          </nav>
        </div>
        <p className="bb-legal">
          BingoBolla opera bajo un modelo de sweepstakes. No es necesario realizar
          ninguna compra para jugar ni para ganar. Las Gold Coins no tienen valor
          monetario. Las Sweeps Coins pueden canjearse según los términos del
          programa. Solo para mayores de 18 años. Juega de forma responsable.
        </p>
        <p className="bb-copy">© {new Date().getFullYear()} BingoBolla · Miami, FL</p>
      </footer>

      {/* ---------- Estilos ---------- */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Monoton&family=Syne:wght@600;700;800&family=Hanken+Grotesk:wght@400;500;600&display=swap');

        .bb-root{
          --bg:#06010D; --magenta:#FF4D9A; --cyan:#3DE8FF; --gold:#C8941A;
          --ink:#F4ECFF; --mut:rgba(244,236,255,.62);
          position:relative; min-height:100vh; background:var(--bg);
          color:var(--ink); font-family:'Hanken Grotesk',sans-serif;
          overflow-x:hidden;
        }
        .bb-root *{box-sizing:border-box; margin:0; padding:0;}
        .bb-root a{color:inherit; text-decoration:none;}

        /* ----- Fondo ----- */
        .bb-bg{position:fixed; inset:0; z-index:0; pointer-events:none;}
        .bb-sky{position:absolute; inset:0;
          background:
            radial-gradient(120% 80% at 50% 0%, #2a0a3d 0%, #14041f 42%, var(--bg) 75%);
        }
        .bb-sun{
          position:absolute; left:50%; top:14%; width:340px; height:340px;
          transform:translateX(-50%);
          background:radial-gradient(circle at 50% 45%,
            #ffd36b 0%, var(--magenta) 38%, transparent 70%);
          border-radius:50%; filter:blur(6px); opacity:.55;
          animation:bbpulse 6s ease-in-out infinite;
        }
        @keyframes bbpulse{0%,100%{opacity:.5}50%{opacity:.72}}
        .bb-grid{
          position:absolute; left:-25%; right:-25%; bottom:0; height:46vh;
          background-image:
            linear-gradient(rgba(61,232,255,.45) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,77,154,.4) 1px, transparent 1px);
          background-size:64px 64px;
          transform:perspective(420px) rotateX(68deg);
          transform-origin:bottom center;
          mask-image:linear-gradient(transparent, #000 30%);
          -webkit-mask-image:linear-gradient(transparent, #000 30%);
          animation:bbgrid 1.8s linear infinite;
        }
        @keyframes bbgrid{from{background-position:0 0,0 0}to{background-position:0 64px,0 0}}
        .bb-grain{
          position:absolute; inset:0; opacity:.05; mix-blend-mode:overlay;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85'/%3E%3C/filter%3E%3Crect width='80' height='80' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        /* ----- Nav ----- */
        .bb-nav{
          position:relative; z-index:5; max-width:1180px; margin:0 auto;
          padding:26px 28px; display:flex; align-items:center; justify-content:space-between;
        }
        .bb-logo{
          font-family:'Monoton',cursive; font-size:26px; letter-spacing:1px;
          color:#fff; text-shadow:0 0 12px var(--magenta),0 0 28px var(--magenta);
        }
        .bb-logo.sm{font-size:20px;}
        .bb-links{display:flex; gap:30px; font-weight:500; font-size:14px;}
        .bb-links a{color:var(--mut); transition:.2s;}
        .bb-links a:hover{color:var(--cyan); text-shadow:0 0 10px var(--cyan);}

        .bb-btn{
          display:inline-flex; align-items:center; gap:6px;
          padding:13px 24px; border-radius:999px; font-weight:600;
          font-size:14px; cursor:pointer; transition:.22s; white-space:nowrap;
        }
        .bb-btn.lg{padding:17px 34px; font-size:16px;}
        .bb-btn-primary{
          background:linear-gradient(100deg,var(--magenta),#ff7ac0);
          color:#1a0010; box-shadow:0 0 0 1px rgba(255,255,255,.15),
          0 10px 30px rgba(255,77,154,.45);
        }
        .bb-btn-primary:hover{transform:translateY(-2px);
          box-shadow:0 0 0 1px rgba(255,255,255,.25),0 14px 40px rgba(255,77,154,.6);}
        .bb-btn-ghost{
          border:1.5px solid rgba(61,232,255,.4); color:var(--cyan);
          background:rgba(61,232,255,.05);
        }
        .bb-btn-ghost:hover{border-color:var(--cyan);
          box-shadow:0 0 22px rgba(61,232,255,.35); transform:translateY(-2px);}

        /* ----- Hero ----- */
        .bb-hero{
          position:relative; z-index:5; max-width:1180px; margin:0 auto;
          padding:70px 28px 90px; display:grid;
          grid-template-columns:1.15fr .85fr; align-items:center; gap:40px;
        }
        .bb-hero-in{opacity:0; transform:translateY(26px);
          transition:opacity .9s ease,transform .9s ease;}
        .bb-hero-in.on{opacity:1; transform:none;}
        .bb-eyebrow{
          display:inline-block; font-size:12px; font-weight:700; letter-spacing:3px;
          color:var(--cyan); margin-bottom:20px; text-shadow:0 0 12px rgba(61,232,255,.5);
        }
        .bb-h1{
          font-family:'Syne',sans-serif; font-weight:800; font-size:clamp(40px,6vw,72px);
          line-height:1.02; letter-spacing:-1.5px;
        }
        .bb-h1-glow{
          color:#fff;
          text-shadow:0 0 16px var(--magenta),0 0 40px rgba(255,77,154,.7);
        }
        .bb-sub{
          margin:24px 0 34px; max-width:520px; font-size:17px;
          line-height:1.65; color:var(--mut);
        }
        .bb-cta{display:flex; gap:14px; flex-wrap:wrap;}
        .bb-trust{
          margin-top:30px; display:flex; gap:22px; flex-wrap:wrap;
          font-size:13px; color:var(--mut);
        }
        .bb-trust span{color:rgba(244,236,255,.5);}

        /* ----- Bolas ----- */
        .bb-balls{position:relative; height:380px;}
        .bb-ball{
          position:absolute; width:90px; height:90px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          font-family:'Syne',sans-serif; font-weight:800; font-size:20px;
          color:#1a0010;
          background:radial-gradient(circle at 32% 28%,#fff 0%,#ffd36b 30%,var(--gold) 70%);
          box-shadow:0 14px 34px rgba(0,0,0,.5),inset 0 -8px 14px rgba(120,70,0,.4);
          animation:bbfloat 5s ease-in-out infinite;
        }
        .bb-ball span{transform:translateY(-1px);}
        .bb-ball.b0{top:6%;  left:18%; animation-delay:0s;}
        .bb-ball.b1{top:0%;  right:6%; width:74px; height:74px;
          background:radial-gradient(circle at 32% 28%,#fff,#7af0ff 30%,var(--cyan) 70%);
          animation-delay:.8s;}
        .bb-ball.b2{top:42%; left:0%;  width:80px; height:80px;
          background:radial-gradient(circle at 32% 28%,#fff,#ff9ccb 30%,var(--magenta) 70%);
          animation-delay:1.6s;}
        .bb-ball.b3{bottom:6%; left:30%; width:68px; height:68px; animation-delay:.4s;}
        .bb-ball.b4{bottom:14%; right:10%;
          background:radial-gradient(circle at 32% 28%,#fff,#7af0ff 30%,var(--cyan) 70%);
          animation-delay:1.2s;}
        @keyframes bbfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-22px)}}

        /* ----- Monedas ----- */
        .bb-coins{
          position:relative; z-index:5; max-width:1000px; margin:0 auto;
          padding:20px 28px 70px; display:grid;
          grid-template-columns:1fr 1fr; gap:22px;
        }
        .bb-coin-card{
          padding:34px; border-radius:22px; backdrop-filter:blur(14px);
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
        }
        .bb-coin-card.gold{border-color:rgba(200,148,26,.4);
          box-shadow:0 0 36px rgba(200,148,26,.12) inset;}
        .bb-coin-card.sweep{border-color:rgba(61,232,255,.4);
          box-shadow:0 0 36px rgba(61,232,255,.12) inset;}
        .bb-coin-ico{font-size:38px; margin-bottom:14px;}
        .bb-coin-card h3{font-family:'Syne',sans-serif; font-size:22px; margin-bottom:10px;}
        .bb-coin-card p{color:var(--mut); font-size:15px; line-height:1.6;}

        /* ----- Secciones ----- */
        .bb-section{
          position:relative; z-index:5; max-width:1180px; margin:0 auto;
          padding:70px 28px;
        }
        .bb-h2{
          font-family:'Syne',sans-serif; font-weight:800;
          font-size:clamp(28px,4vw,44px); letter-spacing:-1px;
          text-align:center; margin-bottom:48px;
        }
        .bb-games{display:grid; grid-template-columns:repeat(3,1fr); gap:20px;}
        .bb-game{
          padding:32px 28px; border-radius:20px;
          background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));
          border:1px solid rgba(255,255,255,.08);
          border-top:3px solid var(--c); transition:.25s;
        }
        .bb-game:hover{transform:translateY(-6px);
          box-shadow:0 18px 50px rgba(0,0,0,.5),0 0 30px color-mix(in srgb,var(--c) 30%,transparent);}
        .bb-game-tag{
          font-size:11px; font-weight:700; letter-spacing:2px; color:var(--c);
        }
        .bb-game h3{font-family:'Syne',sans-serif; font-size:24px; margin:14px 0 10px;}
        .bb-game p{color:var(--mut); font-size:15px; line-height:1.6; margin-bottom:20px;}
        .bb-game-link{color:var(--c); font-weight:600; font-size:14px;}

        /* ----- Mundo ----- */
        .bb-world{
          position:relative; z-index:5; max-width:1180px; margin:30px auto;
          padding:0 28px;
        }
        .bb-world-in{
          padding:60px 48px; border-radius:28px; text-align:center;
          background:
            radial-gradient(120% 140% at 50% 0%, rgba(255,77,154,.18), transparent 60%),
            rgba(255,255,255,.03);
          border:1px solid rgba(255,77,154,.3);
        }
        .bb-world-in .bb-sub{margin-left:auto; margin-right:auto;}

        /* ----- Pasos ----- */
        .bb-steps{display:grid; grid-template-columns:repeat(3,1fr); gap:22px;}
        .bb-step{
          padding:30px; border-radius:18px; background:rgba(255,255,255,.03);
          border:1px solid rgba(255,255,255,.07);
        }
        .bb-step-n{
          font-family:'Syne',sans-serif; font-weight:800; font-size:34px;
          color:transparent; -webkit-text-stroke:1.5px var(--cyan);
          margin-bottom:14px;
        }
        .bb-step h3{font-family:'Syne',sans-serif; font-size:19px; margin-bottom:8px;}
        .bb-step p{color:var(--mut); font-size:14px; line-height:1.6;}
        .bb-final-cta{text-align:center; margin-top:50px;}

        /* ----- Footer ----- */
        .bb-foot{
          position:relative; z-index:5; max-width:1180px; margin:40px auto 0;
          padding:50px 28px 60px; border-top:1px solid rgba(255,255,255,.08);
        }
        .bb-foot-top{
          display:flex; align-items:center; justify-content:space-between;
          flex-wrap:wrap; gap:20px; margin-bottom:30px;
        }
        .bb-foot-links{display:flex; gap:24px; font-size:14px; color:var(--mut);}
        .bb-foot-links a:hover{color:var(--cyan);}
        .bb-legal{
          font-size:12px; line-height:1.7; color:rgba(244,236,255,.4);
          max-width:760px; margin-bottom:16px;
        }
        .bb-copy{font-size:12px; color:rgba(244,236,255,.35);}

        /* ----- Responsive ----- */
        @media (max-width:860px){
          .bb-links{display:none;}
          .bb-hero{grid-template-columns:1fr; padding-top:40px;}
          .bb-balls{height:240px; order:-1;}
          .bb-ball{width:64px!important; height:64px!important; font-size:15px;}
          .bb-coins,.bb-games,.bb-steps{grid-template-columns:1fr;}
          .bb-world-in{padding:40px 24px;}
        }
      `}</style>
    </div>
  );
}
