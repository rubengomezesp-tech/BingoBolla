import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ChevronRight,
  Clock3,
  Coins,
  Gamepad2,
  Gift,
  LockKeyhole,
  Map,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  UsersRound,
  Zap,
} from "lucide-react";

type Tone = "pink" | "gold" | "cyan" | "green" | "violet";

type Action = {
  href: string;
  icon: LucideIcon;
  label: string;
  meta: string;
  tone: Tone;
};

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  tone: Tone;
};

const quickActions: Action[] = [
  {
    href: "/signup",
    icon: Play,
    label: "Crear cuenta gratis",
    meta: "Entra al lobby y reclama tu bienvenida",
    tone: "pink",
  },
  {
    href: "/mundos",
    icon: Map,
    label: "Explorar mundos",
    meta: "Miami Nights, nodos y minijuegos",
    tone: "cyan",
  },
  {
    href: "/login",
    icon: Zap,
    label: "Volver a jugar",
    meta: "Continua tu racha en segundos",
    tone: "gold",
  },
];

const loopSteps: Feature[] = [
  {
    icon: UsersRound,
    title: "Bingo social",
    body: "Salas con ritmo rápido, chat y premios visibles antes de entrar.",
    tone: "pink",
  },
  {
    icon: Gamepad2,
    title: "Arcade entre partidas",
    body: "Ball Match, Neural Cascade y retos cortos que alimentan tu progreso.",
    tone: "cyan",
  },
  {
    icon: Gift,
    title: "Recompensas diarias",
    body: "Cofres, bonos y rachas pensadas para volver sin perder claridad.",
    tone: "gold",
  },
  {
    icon: Trophy,
    title: "Mundos con meta",
    body: "Cada nodo enseña lo que desbloqueas y por qué vale la siguiente jugada.",
    tone: "green",
  },
];

const trustItems: Feature[] = [
  {
    icon: ShieldCheck,
    title: "Sweepstakes claro",
    body: "No hace falta comprar para jugar o ganar. La información legal va visible.",
    tone: "cyan",
  },
  {
    icon: LockKeyhole,
    title: "Cuenta protegida",
    body: "Autenticación, límites y controles pensados para una plataforma seria.",
    tone: "violet",
  },
  {
    icon: Clock3,
    title: "Juego responsable",
    body: "Señales de edad, límites y descansos sin esconder las condiciones.",
    tone: "green",
  },
];

const boardNumbers = [
  "B7",
  "I22",
  "N41",
  "G58",
  "O73",
  "B12",
  "I30",
  "NFREE",
  "G62",
  "O69",
  "B3",
  "I18",
  "N44",
  "G55",
  "O71",
];

export default function Home() {
  return (
    <main className="home2026">
      <style>{HOME_CSS}</style>

      <header className="home-nav" aria-label="Navegacion principal">
        <Link href="/" className="home-brand" aria-label="BingoBolla inicio">
          <Image src="/icons/logo-header.png" alt="" width={72} height={60} priority />
          <span>BingoBolla</span>
        </Link>
        <nav className="home-links" aria-label="Secciones">
          <Link href="/mundos">Mundos</Link>
          <Link href="/lobby">Lobby</Link>
          <Link href="/cofres">Cofres</Link>
          <Link href="/limites">Juego responsable</Link>
        </nav>
        <div className="home-navActions">
          <Link href="/login" className="home-linkButton">
            Entrar
          </Link>
          <Link href="/signup" className="home-primaryButton compact">
            Jugar gratis
          </Link>
        </div>
      </header>

      <section className="hero-stage" aria-labelledby="home-title">
        <div className="hero-candyRail rail-a" aria-hidden="true" />
        <div className="hero-candyRail rail-b" aria-hidden="true" />
        <div className="hero-balls" aria-hidden="true">
          {["B7", "I22", "N41", "G58", "O73"].map((ball, index) => (
            <span key={ball} className={`hero-ball ball-${index}`}>
              {ball}
            </span>
          ))}
        </div>

        <div className="hero-copy">
          <div className="hero-logo">
            <Image src="/icons/logo-header.png" alt="BingoBolla" width={300} height={250} priority />
          </div>
          <p className="hero-kicker">
            <Sparkles size={18} aria-hidden="true" />
            Bingo social, mundos arcade y premios sweepstakes
          </p>
          <h1 id="home-title">BingoBolla</h1>
          <p className="hero-subtitle">
            Entra a salas en vivo, avanza por Miami Nights y desbloquea cofres con una experiencia
            rápida, brillante y preparada para móvil.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="home-primaryButton">
              <Play size={20} aria-hidden="true" />
              Crear cuenta gratis
            </Link>
            <Link href="/mundos" className="home-secondaryButton">
              <Map size={20} aria-hidden="true" />
              Ver mundos
            </Link>
          </div>
          <div className="hero-trust" aria-label="Condiciones principales">
            <span>18+</span>
            <span>No purchase necessary</span>
            <span>Gold Coins sin valor monetario</span>
          </div>
        </div>

        <div className="hero-board" aria-hidden="true">
          <div className="board-top">
            <span>LIVE BOARD</span>
            <b>4 TG</b>
          </div>
          <div className="board-grid">
            {boardNumbers.map((number, index) => (
              <span key={`${number}-${index}`} className={index % 4 === 0 ? "marked" : ""}>
                {number === "NFREE" ? "FREE" : number}
              </span>
            ))}
          </div>
          <div className="board-prize">
            <Coins size={16} aria-hidden="true" />
            25,000 prize pool
          </div>
        </div>
      </section>

      <section className="quick-dock" aria-label="Acciones principales">
        {quickActions.map((action) => (
          <Link key={action.label} href={action.href} className={`quick-action tone-${action.tone}`}>
            <span className="quick-icon">
              <action.icon size={22} aria-hidden="true" />
            </span>
            <span>
              <b>{action.label}</b>
              <small>{action.meta}</small>
            </span>
            <ChevronRight size={19} aria-hidden="true" />
          </Link>
        ))}
      </section>

      <section className="play-loop" aria-labelledby="loop-title">
        <div className="section-heading">
          <p>El loop principal</p>
          <h2 id="loop-title">Una sesión con ritmo de juego, no de formulario</h2>
        </div>
        <div className="loop-grid">
          {loopSteps.map((item) => (
            <article key={item.title} className={`loop-item tone-${item.tone}`}>
              <div className="loop-icon">
                <item.icon size={24} aria-hidden="true" />
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="world-band" aria-labelledby="world-title">
        <div className="world-copy">
          <p>Miami Nights</p>
          <h2 id="world-title">El mapa convierte cada victoria en progreso visible</h2>
          <span>
            Nodos, estrellas, XP y minijuegos unidos en una ruta clara. La home empuja al usuario a
            jugar, pero también explica por qué la plataforma se siente seria.
          </span>
          <Link href="/mundos" className="home-secondaryButton dark">
            <Map size={20} aria-hidden="true" />
            Abrir mundos
          </Link>
        </div>
        <div className="world-path" aria-hidden="true">
          {Array.from({ length: 7 }).map((_, index) => (
            <span key={index} className={index < 4 ? "done" : index === 4 ? "active" : ""}>
              {index < 4 ? <Star size={18} fill="currentColor" /> : index === 4 ? <Zap size={20} /> : index + 1}
            </span>
          ))}
        </div>
      </section>

      <section className="trust-band" aria-labelledby="trust-title">
        <div className="section-heading">
          <p>Confianza antes de jugar</p>
          <h2 id="trust-title">Color, premios y control en el mismo sistema</h2>
        </div>
        <div className="trust-grid">
          {trustItems.map((item) => (
            <article key={item.title} className={`trust-item tone-${item.tone}`}>
              <item.icon size={25} aria-hidden="true" />
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta" aria-labelledby="final-title">
        <div>
          <p>Listo para jugar</p>
          <h2 id="final-title">Entra gratis y reclama tu primera racha</h2>
        </div>
        <Link href="/signup" className="home-primaryButton">
          <Gift size={20} aria-hidden="true" />
          Crear cuenta gratis
        </Link>
      </section>

      <footer className="home-footer">
        <Image src="/icons/logo-header.png" alt="" width={54} height={45} />
        <p>
          BingoBolla opera bajo un modelo de sweepstakes. No es necesario comprar para jugar ni ganar.
          Solo mayores de 18 años. Juega de forma responsable.
        </p>
      </footer>
    </main>
  );
}

const HOME_CSS = `
.home2026{
  --home-bg:#07070d;
  --home-ink:#fffaf5;
  --home-muted:#cfc8da;
  --home-soft:#a9a0b8;
  --home-pink:#ff3d7f;
  --home-gold:#ffd93d;
  --home-cyan:#00e5ff;
  --home-green:#00e676;
  --home-violet:#b388ff;
  --home-panel:#14111f;
  --home-line:#2a2538;
  min-height:100vh;
  background:
    linear-gradient(180deg,rgba(7,7,13,.96),rgba(7,7,13,.88) 52%,#08080c 100%),
    radial-gradient(circle at 50% 8%,rgba(255,217,61,.18),transparent 32%),
    radial-gradient(circle at 16% 34%,rgba(255,61,127,.24),transparent 28%),
    radial-gradient(circle at 84% 28%,rgba(0,229,255,.16),transparent 30%),
    var(--home-bg);
  color:var(--home-ink);
  font-family:var(--font-sans,Geist,system-ui,sans-serif);
  letter-spacing:0;
  overflow-x:hidden;
  position:relative;
  isolation:isolate;
}
.home2026 *{box-sizing:border-box}
.home2026 a{color:inherit;text-decoration:none}
.home-nav{
  position:relative;
  z-index:4;
  width:min(1180px,calc(100% - 32px));
  margin:0 auto;
  min-height:78px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:18px;
}
.home-brand{
  display:flex;
  align-items:center;
  gap:10px;
  font-size:19px;
  font-weight:950;
}
.home-brand img{width:58px;height:auto;filter:drop-shadow(0 12px 18px rgba(0,0,0,.42))}
.home-links{
  display:flex;
  align-items:center;
  gap:4px;
  padding:5px;
  border:1px solid rgba(255,255,255,.09);
  border-radius:999px;
  background:rgba(255,255,255,.045);
}
.home-links a{
  min-height:36px;
  display:inline-flex;
  align-items:center;
  padding:0 14px;
  border-radius:999px;
  color:var(--home-muted);
  font-size:13px;
  font-weight:750;
}
.home-links a:hover{background:rgba(255,255,255,.08);color:#fff}
.home-navActions{display:flex;align-items:center;gap:10px}
.home-linkButton{
  min-height:42px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:0 16px;
  border-radius:999px;
  color:#fff;
  font-size:14px;
  font-weight:850;
}
.home-primaryButton,.home-secondaryButton{
  min-height:52px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  border-radius:999px;
  padding:0 22px;
  border:0;
  font-size:15px;
  font-weight:950;
  cursor:pointer;
  transition:transform .18s ease,filter .18s ease,background .18s ease,border-color .18s ease;
}
.home-primaryButton{
  background:linear-gradient(180deg,#fff07f 0%,var(--home-gold) 47%,#c77700 100%);
  color:#261400;
  box-shadow:0 12px 28px rgba(255,174,20,.24),inset 0 1px 0 rgba(255,255,255,.75);
}
.home-primaryButton.compact{min-height:42px;padding:0 17px;font-size:14px}
.home-secondaryButton{
  border:1px solid rgba(255,255,255,.16);
  background:rgba(255,255,255,.065);
  color:#fff;
}
.home-secondaryButton.dark{background:#12131b;border-color:#262a38}
.home-primaryButton:hover,.home-secondaryButton:hover{transform:translateY(-2px);filter:brightness(1.06)}
.home-primaryButton:focus-visible,.home-secondaryButton:focus-visible,.home-linkButton:focus-visible,.home-links a:focus-visible,.quick-action:focus-visible{
  outline:3px solid rgba(0,229,255,.92);
  outline-offset:3px;
}
.hero-stage{
  position:relative;
  z-index:2;
  min-height:82svh;
  width:min(1180px,calc(100% - 32px));
  margin:0 auto;
  padding:36px 0 58px;
  display:grid;
  place-items:center;
}
.hero-copy{
  position:relative;
  z-index:3;
  max-width:760px;
  text-align:center;
  display:flex;
  flex-direction:column;
  align-items:center;
}
.hero-logo{
  width:min(300px,62vw);
  margin-bottom:2px;
  filter:drop-shadow(0 24px 32px rgba(0,0,0,.48));
  animation:home-pop .5s ease-out both;
}
.hero-logo img{width:100%;height:auto}
.hero-kicker{
  display:inline-flex;
  align-items:center;
  gap:8px;
  margin:2px 0 14px;
  padding:8px 12px;
  border-radius:999px;
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.12);
  color:#ffeec0;
  font-size:14px;
  font-weight:850;
}
.hero-copy h1{
  margin:0;
  color:#fff;
  font-size:88px;
  line-height:.92;
  font-weight:1000;
  letter-spacing:0;
  text-shadow:0 8px 0 rgba(0,0,0,.22),0 0 32px rgba(255,217,61,.28);
}
.hero-subtitle{
  width:min(640px,100%);
  margin:18px auto 0;
  color:var(--home-muted);
  font-size:18px;
  line-height:1.58;
  font-weight:600;
  text-wrap:pretty;
}
.hero-actions{
  display:flex;
  justify-content:center;
  flex-wrap:wrap;
  gap:12px;
  margin-top:28px;
}
.hero-trust{
  display:flex;
  justify-content:center;
  flex-wrap:wrap;
  gap:8px;
  margin-top:18px;
}
.hero-trust span{
  min-height:30px;
  display:inline-flex;
  align-items:center;
  border:1px solid rgba(255,255,255,.12);
  border-radius:999px;
  padding:0 11px;
  color:#ded8e9;
  background:rgba(0,0,0,.2);
  font-size:12px;
  font-weight:800;
}
.hero-candyRail{
  position:absolute;
  inset:auto auto 10% 50%;
  width:860px;
  height:230px;
  border-radius:999px;
  transform:translateX(-50%) rotate(-8deg);
  border:16px solid rgba(255,255,255,.08);
  background:
    linear-gradient(90deg,transparent 0 5%,rgba(255,61,127,.92) 5% 11%,transparent 11% 17%,rgba(255,217,61,.92) 17% 23%,transparent 23% 29%,rgba(0,229,255,.86) 29% 35%,transparent 35% 41%,rgba(0,230,118,.82) 41% 47%,transparent 47% 100%);
  opacity:.58;
  filter:drop-shadow(0 22px 30px rgba(0,0,0,.34));
  pointer-events:none;
}
.hero-candyRail.rail-b{
  top:12%;
  bottom:auto;
  width:720px;
  height:190px;
  transform:translateX(-50%) rotate(9deg);
  opacity:.32;
}
.hero-balls{
  position:absolute;
  inset:0;
  pointer-events:none;
}
.hero-ball{
  position:absolute;
  width:72px;
  height:72px;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:radial-gradient(circle at 32% 24%,#fff 0 14%,#ffd9e8 15% 28%,var(--ball-color) 56%,#7b173a 100%);
  box-shadow:inset 0 -9px 18px rgba(0,0,0,.28),0 14px 26px rgba(0,0,0,.34);
  color:#fff;
  font-weight:1000;
  text-shadow:0 2px 4px rgba(0,0,0,.35);
  animation:home-float 5.2s ease-in-out infinite;
}
.ball-0{--ball-color:var(--home-pink);left:5%;top:19%}
.ball-1{--ball-color:var(--home-gold);color:#2a1700;left:20%;bottom:13%;animation-delay:.55s}
.ball-2{--ball-color:var(--home-cyan);color:#031c22;right:23%;top:17%;animation-delay:1.05s}
.ball-3{--ball-color:var(--home-green);color:#032512;right:7%;bottom:18%;animation-delay:1.35s}
.ball-4{--ball-color:var(--home-violet);left:8%;bottom:36%;animation-delay:1.7s}
.hero-board{
  position:absolute;
  right:0;
  bottom:56px;
  width:266px;
  padding:12px;
  border:1px solid rgba(255,255,255,.13);
  border-radius:8px;
  background:#11121a;
  box-shadow:0 18px 34px rgba(0,0,0,.28);
  transform:rotate(3deg);
}
.board-top,.board-prize{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  color:#efeafa;
  font-size:12px;
  font-weight:950;
}
.board-top b{
  min-width:46px;
  min-height:26px;
  display:grid;
  place-items:center;
  border-radius:999px;
  background:var(--home-pink);
}
.board-grid{
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:5px;
  margin:12px 0;
}
.board-grid span{
  aspect-ratio:1;
  display:grid;
  place-items:center;
  border-radius:7px;
  background:#202232;
  border:1px solid rgba(255,255,255,.08);
  color:#fff;
  font-size:11px;
  font-weight:950;
}
.board-grid span.marked{
  background:#ffe46d;
  color:#2b1700;
  box-shadow:0 0 0 2px rgba(255,217,61,.16);
}
.board-prize{
  justify-content:center;
  min-height:30px;
  color:#ffeeb5;
  border-radius:7px;
  background:rgba(255,217,61,.1);
}
.quick-dock{
  position:relative;
  z-index:3;
  width:min(1120px,calc(100% - 32px));
  margin:-20px auto 0;
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:10px;
}
.quick-action{
  min-height:92px;
  display:grid;
  grid-template-columns:auto minmax(0,1fr) auto;
  align-items:center;
  gap:12px;
  padding:16px;
  border-radius:8px;
  background:#13131d;
  border:1px solid #252638;
  transition:transform .18s ease,border-color .18s ease,background .18s ease;
}
.quick-action:hover{transform:translateY(-3px);border-color:var(--tone);background:#171827}
.quick-icon,.loop-icon{
  width:42px;
  height:42px;
  display:grid;
  place-items:center;
  border-radius:8px;
  color:#071016;
  background:var(--tone);
}
.quick-action b{
  display:block;
  color:#fff;
  font-size:15px;
  font-weight:950;
  line-height:1.15;
}
.quick-action small{
  display:block;
  margin-top:4px;
  color:var(--home-soft);
  font-size:12px;
  line-height:1.35;
  font-weight:700;
}
.tone-pink{--tone:var(--home-pink)}
.tone-gold{--tone:var(--home-gold)}
.tone-cyan{--tone:var(--home-cyan)}
.tone-green{--tone:var(--home-green)}
.tone-violet{--tone:var(--home-violet)}
.play-loop,.trust-band{
  position:relative;
  z-index:2;
  width:min(1120px,calc(100% - 32px));
  margin:0 auto;
  padding:84px 0 18px;
}
.section-heading{
  max-width:650px;
  margin-bottom:24px;
}
.section-heading p,.world-copy p,.final-cta p{
  margin:0 0 9px;
  color:#ffe37a;
  font-size:13px;
  font-weight:950;
}
.section-heading h2,.world-copy h2,.final-cta h2{
  margin:0;
  color:#fff;
  font-size:36px;
  line-height:1.08;
  font-weight:1000;
  letter-spacing:0;
  text-wrap:balance;
}
.loop-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:10px;
}
.loop-item,.trust-item{
  min-height:210px;
  padding:18px;
  border-radius:8px;
  background:#12131c;
  border:1px solid #242637;
}
.loop-item h3,.trust-item h3{
  margin:18px 0 9px;
  color:#fff;
  font-size:18px;
  line-height:1.16;
  font-weight:950;
}
.loop-item p,.trust-item p,.world-copy span,.home-footer p{
  margin:0;
  color:var(--home-muted);
  font-size:14px;
  line-height:1.55;
  font-weight:620;
  text-wrap:pretty;
}
.world-band{
  position:relative;
  z-index:2;
  width:min(1120px,calc(100% - 32px));
  margin:62px auto 0;
  min-height:360px;
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(340px,520px);
  gap:22px;
  align-items:center;
  padding:34px;
  border-radius:8px;
  background:
    linear-gradient(120deg,#f7f4ff 0%,#fff7c8 48%,#c9f8ff 100%);
  color:#101018;
  overflow:hidden;
}
.world-copy{position:relative;z-index:2;max-width:520px}
.world-copy p{color:#8d2b50}
.world-copy h2{color:#101018}
.world-copy span{display:block;color:#393443;margin:14px 0 24px}
.world-path{
  position:relative;
  min-height:260px;
  display:grid;
  grid-template-columns:repeat(7,1fr);
  align-items:center;
  gap:8px;
}
.world-path:before{
  content:"";
  position:absolute;
  left:4%;
  right:4%;
  top:50%;
  height:12px;
  border-radius:999px;
  background:#1c1d29;
}
.world-path span{
  position:relative;
  z-index:1;
  width:52px;
  height:52px;
  display:grid;
  place-items:center;
  justify-self:center;
  border-radius:50%;
  background:#1c1d29;
  color:#f9f7ff;
  font-weight:950;
  box-shadow:0 12px 20px rgba(0,0,0,.18);
}
.world-path span.done{background:#00b966;color:#fff}
.world-path span.active{
  width:76px;
  height:76px;
  background:var(--home-pink);
  color:#fff;
  box-shadow:0 0 0 10px rgba(255,61,127,.18),0 18px 28px rgba(0,0,0,.22);
  animation:home-pulse 1.8s ease-in-out infinite;
}
.trust-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:10px;
}
.trust-item{
  min-height:190px;
}
.trust-item svg{
  color:var(--tone);
}
.final-cta{
  position:relative;
  z-index:2;
  width:min(1120px,calc(100% - 32px));
  margin:68px auto 0;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;
  padding:28px;
  border-radius:8px;
  background:#151622;
  border:1px solid #282b3d;
}
.final-cta h2{font-size:30px}
.home-footer{
  position:relative;
  z-index:2;
  width:min(1120px,calc(100% - 32px));
  margin:44px auto 0;
  padding:28px 0 44px;
  display:flex;
  align-items:center;
  gap:16px;
  border-top:1px solid rgba(255,255,255,.1);
}
.home-footer img{width:54px;height:auto;flex:0 0 auto}
.home-footer p{max-width:780px;font-size:12px;color:#aaa2b8}
@keyframes home-float{
  0%,100%{transform:translate3d(0,0,0) rotate(-3deg)}
  50%{transform:translate3d(0,-14px,0) rotate(4deg)}
}
@keyframes home-pop{
  from{opacity:0;transform:translateY(10px) scale(.94)}
  to{opacity:1;transform:none}
}
@keyframes home-pulse{
  0%,100%{transform:scale(1)}
  50%{transform:scale(1.05)}
}
@media (max-width: 980px){
  .home-links{display:none}
  .hero-copy h1{font-size:68px}
  .hero-board{position:relative;right:auto;bottom:auto;margin-top:32px;transform:none}
  .quick-dock,.loop-grid,.trust-grid{grid-template-columns:1fr}
  .world-band{grid-template-columns:1fr;padding:24px}
  .world-path{min-height:160px}
  .final-cta{align-items:flex-start;flex-direction:column}
}
@media (max-width: 640px){
  .home-nav{width:min(100% - 20px,1180px);min-height:70px}
  .home-brand span{display:none}
  .home-brand img{width:50px}
  .home-navActions{gap:4px}
  .home-linkButton{padding:0 10px}
  .home-primaryButton.compact{padding:0 12px}
  .hero-stage{width:min(100% - 20px,1180px);min-height:80svh;padding-top:12px}
  .hero-logo{width:min(220px,70vw)}
  .hero-kicker{font-size:12px;line-height:1.25}
  .hero-copy h1{font-size:48px}
  .hero-subtitle{font-size:15px}
  .hero-actions{width:100%}
  .hero-actions .home-primaryButton,.hero-actions .home-secondaryButton{width:100%}
  .hero-ball{width:54px;height:54px;font-size:13px}
  .ball-2{right:4%;top:18%}
  .ball-3{right:5%;bottom:24%}
  .ball-1{left:6%;bottom:10%}
  .hero-candyRail{width:520px;height:160px;border-width:10px}
  .quick-dock,.play-loop,.world-band,.trust-band,.final-cta,.home-footer{width:min(100% - 20px,1120px)}
  .section-heading h2,.world-copy h2{font-size:28px}
  .world-path{grid-template-columns:repeat(7,48px);overflow-x:auto;padding:16px 0}
  .world-path span{width:44px;height:44px}
  .world-path span.active{width:60px;height:60px}
  .home-footer{align-items:flex-start}
}
@media (prefers-reduced-motion: reduce){
  .home2026 *, .home2026 *:before, .home2026 *:after{
    animation:none!important;
    transition:none!important;
    scroll-behavior:auto!important;
  }
}
`;
