"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Coins, Gem, Gift, Home, Map, Menu, Plus, ShoppingCart, UserPlus, UsersRound, Zap } from "lucide-react";
import XpBar from "@/components/XpBar";

type RoomLite = {
  id: string;
  name: string;
  variant: string;
  ticket_gold: number;
  ticket_sweeps: number;
  players_in_play: number | null;
  effective_pot_sweeps: number | null;
};

type Stats = {
  games_played: number;
  total_wins: number;
  current_streak: number;
  total_sweeps_won: number;
};

const ASSET_BASE =
  "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/home-lobby";

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));

export default function HomeScreen({
  username,
  gold,
  sweeps,
  state,
  stateExcluded,
  rooms,
  stats,
}: {
  username: string;
  gold: number;
  sweeps: number;
  state: string | null;
  stateExcluded: boolean;
  rooms: RoomLite[];
  stats: Stats | null;
}) {
  const router = useRouter();
  const [online, setOnline] = useState(24532);
  const [toast, setToast] = useState<{ e: string; m: string; d: string } | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setOnline((n) => Math.max(20000, n + Math.floor(Math.random() * 31) - 12));
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  function flash(e: string, m: string, d: string) {
    setToast({ e, m, d });
    window.setTimeout(() => setToast(null), 2200);
  }

  const roomCards = useMemo(() => buildRoomCards(rooms), [rooms]);
  const firstRoom = rooms[0];

  return (
    <div className="hs-root">
      <style>{HS_CSS}</style>
      <div className="hs-bg" />
      <div className="hs-sparkles" aria-hidden>
        {Array.from({ length: 42 }).map((_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 29) % 100}%`,
              top: `${(i * 47) % 88}%`,
              animationDelay: `${(i % 7) * 0.35}s`,
            }}
          />
        ))}
      </div>

      <main className="hs-shell">
        <header className="hs-top">
          <button className="hs-logoBtn" onClick={() => router.push("/lobby")} aria-label="Inicio">
            <span>BINGO</span>
            <strong>BOLLA</strong>
            <b>♛</b>
          </button>

          <div className="hs-wallet">
            <CurrencyPill icon={<Coins />} value={money(gold)} onClick={() => router.push("/store")} />
            <CurrencyPill icon={<Gem />} value={money(sweeps)} timer="01:25" onClick={() => router.push("/store")} />
            <CurrencyPill icon={<Zap />} value="5" onClick={() => router.push("/store")} />
          </div>
        </header>

        <section className="hs-playerRow">
          <button className="hs-profile" onClick={() => router.push("/account")}>
            <div className="hs-avatar">
              <span>{username?.[0]?.toUpperCase() ?? "B"}</span>
            </div>
            <div className="hs-profileText">
              <div className="hs-playerName">{username || "BingoStar"}</div>
              <div className="hs-levelLine">
                <span className="hs-levelBadge">23</span>
                <div className="hs-xpMini">
                  <div className="hs-xpMiniFill" style={{ width: "82%" }} />
                </div>
                <span>XP 12,350 / 15,000</span>
              </div>
            </div>
          </button>

          <div className="hs-actions">
            <button className="hs-actionGift" onClick={() => router.push("/regalo")} aria-label="Regalo diario">
              <Gift /> <b>3</b>
            </button>
            <button className="hs-menu" onClick={() => router.push("/account")} aria-label="Menu">
              <Menu />
            </button>
          </div>
        </section>

        <div className="hs-xpReal">
          <XpBar onToast={flash} />
        </div>

        {stateExcluded && (
          <div className="hs-warn">
            <strong>{state}</strong> tiene restricciones: solo juego con Gold Coins.
          </div>
        )}

        <section className="hs-event" onClick={() => router.push("/mundo")}>
          <div className="hs-eventCopy">
            <span>EVENTO ESPECIAL</span>
            <h1>FIESTA<br />TROPICAL</h1>
            <div className="hs-eventTimer">⏱ Termina en: 2d 18h</div>
          </div>
          <div className="hs-eventMascots" aria-hidden>
            <div className="hs-bolla hs-bollaPurple">●</div>
            <div className="hs-bolla hs-bollaGold">●</div>
          </div>
        </section>

        <section className="hs-playHero">
          <div className="hs-kingBolla" aria-hidden>
            <span>◕</span>
          </div>
          <div className="hs-playCopy">
            <h2>¿LISTO PARA GANAR?</h2>
            <p>★ Elige tu sala y empieza a jugar ★</p>
            <button
              className="hs-playButton"
              onClick={() => (firstRoom ? router.push(`/room/${firstRoom.id}`) : router.push("/lobby#salas"))}
            >
              <strong>JUGAR BINGO</strong>
              <span>Elige tu sala y gana!</span>
            </button>
          </div>
          <div className="hs-cityBalls" aria-hidden>
            <div className="hs-wheel" />
            <div className="hs-ballPink">7</div>
            <div className="hs-ballBlue">33</div>
          </div>
        </section>

        <section id="salas" className="hs-section hs-rooms">
          <div className="hs-sectionHead">
            <h2>SALAS EN VIVO</h2>
            <button onClick={() => router.push("/lobby#salas")}>Ver todas</button>
          </div>
          <div className="hs-roomGrid">
            {roomCards.map((room, index) => (
              <button
                key={room.id || room.title}
                className={`hs-roomCard hs-room-${index}`}
                onClick={() => (room.id ? router.push(`/room/${room.id}`) : flash("🎱", "Sala", "Pronto disponible"))}
              >
                <span className="hs-live">LIVE</span>
                <div className="hs-roomTitle">{room.title}</div>
                <div className="hs-players">🧍 {room.players} Jugadores</div>
                <div className="hs-prizeLabel">Premio Mayor</div>
                <div className="hs-prize">🪙 {money(room.prize)}</div>
                <div className="hs-roomPlay">JUGAR</div>
              </button>
            ))}
          </div>
        </section>

        <section className="hs-offers">
          <button className="hs-offerCard hs-offerSpecial" onClick={() => router.push("/store")}>
            <div>
              <h3>OFERTA ESPECIAL</h3>
              <p>Paquete de Inicio</p>
              <span>VER OFERTAS</span>
            </div>
            <div className="hs-chestArt">🎁</div>
          </button>
          <button className="hs-offerCard" onClick={() => router.push("/regalo")}>
            <div>
              <h3>COFRE GRATIS</h3>
              <p>Siguiente en:</p>
              <strong>⏱ 02:45:30</strong>
            </div>
            <div className="hs-chestArt">💰</div>
          </button>
        </section>

        <section className="hs-section hs-missions">
          <div className="hs-sectionHead">
            <h2>MISIONES DIARIAS <b>2</b></h2>
          </div>
          <div className="hs-missionGrid">
            <Mission icon="✅" title="Juega 3 partidas" now={Math.min(stats?.games_played ?? 0, 3)} max={3} reward={500} />
            <Mission icon="🟣" title="Gana 2 bingos" now={Math.min(stats?.total_wins ?? 0, 2)} max={2} reward={750} />
            <Mission icon="🎈" title="Usa 3 Power Ups" now={0} max={3} reward={500} />
          </div>
        </section>

        <nav className="hs-bottomNav" aria-label="Navegacion principal">
          <button className="active" onClick={() => router.push("/lobby")}><Home /><span>INICIO</span></button>
          <button onClick={() => router.push("/store")}><ShoppingCart /><b>1</b><span>TIENDA</span></button>
          <button onClick={() => router.push("/mundo")}><Map /><span>MAPA</span></button>
          <button onClick={() => router.push("/invitar")}><UsersRound /><b>5</b><span>AMIGOS</span></button>
          <button onClick={() => router.push("/vip")}><Gift /><b>2</b><span>COFRES</span></button>
        </nav>

        <section className="hs-friends">
          <div className="hs-friendFaces" aria-hidden>
            <span>😎</span>
            <span>🐶</span>
          </div>
          <div>
            <h2>JUEGA CON AMIGOS</h2>
            <p>Crea tu squad y disfruten juntos cada partida!</p>
            <button onClick={() => router.push("/invitar")}><UserPlus /> INVITAR AMIGOS</button>
          </div>
          <div className="hs-friendFaces right" aria-hidden>
            <span>🙂</span>
            <span>😊</span>
          </div>
        </section>

        <div className="hs-liveCount">
          <i />
          {online.toLocaleString()} jugadores conectados ahora
        </div>
      </main>

      {toast && (
        <div className="hs-toast">
          <div>{toast.e}</div>
          <strong>{toast.m}</strong>
          <span>{toast.d}</span>
        </div>
      )}
    </div>
  );
}

function CurrencyPill({
  icon,
  value,
  timer,
  onClick,
}: {
  icon: ReactNode;
  value: string;
  timer?: string;
  onClick: () => void;
}) {
  return (
    <button className="hs-currency" onClick={onClick}>
      <span className="hs-currencyIcon">{icon}</span>
      <strong>{value}</strong>
      <i><Plus /></i>
      {timer && <em>{timer}</em>}
    </button>
  );
}

function Mission({
  icon,
  title,
  now,
  max,
  reward,
}: {
  icon: string;
  title: string;
  now: number;
  max: number;
  reward: number;
}) {
  const pct = Math.min(100, Math.round((now / max) * 100));
  return (
    <div className="hs-mission">
      <div className="hs-missionIcon">{icon}</div>
      <div className="hs-missionBody">
        <div className="hs-missionTitle">{title}</div>
        <div className="hs-missionProgress">{now}/{max}</div>
        <div className="hs-missionTrack"><i style={{ width: `${pct}%` }} /></div>
      </div>
      <div className="hs-missionReward">🪙 {reward}</div>
    </div>
  );
}

function buildRoomCards(rooms: RoomLite[]) {
  const fallback = [
    { title: "BINGO FIESTA", players: 75, prize: 25000, id: "" },
    { title: "BINGO 90", players: 132, prize: 50000, id: "" },
    { title: "POWER BINGO", players: 54, prize: 15000, id: "" },
  ];

  return fallback.map((fallbackRoom, index) => {
    const live = rooms[index];
    return {
      id: live?.id ?? fallbackRoom.id,
      title:
        index === 0
          ? "BINGO FIESTA"
          : live?.variant?.toLowerCase().includes("90")
            ? "BINGO 90"
            : index === 2
              ? "POWER BINGO"
              : live?.name ?? fallbackRoom.title,
      players: live?.players_in_play ?? fallbackRoom.players,
      prize: Math.max(
        fallbackRoom.prize,
        Math.round(Number(live?.effective_pot_sweeps ?? 0) * 1000)
      ),
    };
  });
}

const HS_CSS = `
.hs-root{
  position:relative;min-height:100dvh;overflow-x:hidden;color:#fff;
  background:#05020f;font-family:Inter,ui-sans-serif,system-ui,sans-serif;
}
.hs-root button{font:inherit;}
.hs-bg{
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background:
    linear-gradient(180deg,rgba(3,1,12,.62),rgba(5,1,17,.92) 58%,#05020f 100%),
    url("${ASSET_BASE}/lobby-home-bg-mobile.webp"),
    radial-gradient(circle at 50% 12%,rgba(110,20,190,.7),transparent 34%),
    linear-gradient(180deg,#09031d,#140328 46%,#05020f);
  background-size:cover;
  background-position:center top;
}
.hs-sparkles{position:fixed;inset:0;z-index:1;pointer-events:none;overflow:hidden;}
.hs-sparkles i{
  position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;
  box-shadow:0 0 10px #ff4dff,0 0 18px #2ae7ff;
  opacity:.15;animation:hsTwinkle 3.4s ease-in-out infinite;
}
@keyframes hsTwinkle{50%{opacity:.95;transform:scale(1.9)}}
.hs-shell{
  position:relative;z-index:2;width:min(100%,1060px);margin:0 auto;
  padding:22px 26px 36px;
}
.hs-top{display:grid;grid-template-columns:1fr;gap:16px;align-items:start;}
.hs-logoBtn{
  position:relative;width:max-content;border:0;background:transparent;color:#fff;cursor:pointer;
  line-height:.83;text-align:left;text-shadow:0 0 18px rgba(255,65,236,.9),0 5px 10px rgba(0,0,0,.7);
}
.hs-logoBtn span,.hs-logoBtn strong{display:block;font-size:48px;font-weight:1000;letter-spacing:-2px;}
.hs-logoBtn span{color:#fff;}
.hs-logoBtn strong{
  background:linear-gradient(180deg,#fff1a0 4%,#ffb01f 40%,#ff5b12 84%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.hs-logoBtn b{position:absolute;right:-8px;top:-13px;color:#ffcf3d;font-size:30px;transform:rotate(11deg);}
.hs-wallet{display:flex;gap:14px;align-items:flex-start;overflow-x:auto;padding-bottom:7px;scrollbar-width:none;}
.hs-wallet::-webkit-scrollbar{display:none;}
.hs-currency{
  position:relative;min-width:158px;height:58px;display:grid;grid-template-columns:46px 1fr 36px;
  align-items:center;gap:7px;border-radius:28px;border:1.5px solid rgba(216,76,255,.45);
  background:linear-gradient(180deg,rgba(38,8,58,.92),rgba(10,4,30,.95));
  color:#fff;box-shadow:0 0 20px rgba(147,35,238,.32),inset 0 1px 0 rgba(255,255,255,.14);
  padding:6px 7px;cursor:pointer;
}
.hs-currencyIcon{
  width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font-size:25px;
  background:radial-gradient(circle at 30% 24%,#fff6aa,#f4a716 62%,#7d3d00);
  box-shadow:0 0 15px rgba(255,188,41,.5);
}
.hs-currencyIcon svg{width:27px;height:27px;stroke-width:3;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3));}
.hs-currency:nth-child(2) .hs-currencyIcon{background:radial-gradient(circle at 32% 25%,#ffb1ff,#e62aa5 62%,#771f8c);}
.hs-currency:nth-child(3) .hs-currencyIcon{background:radial-gradient(circle at 32% 25%,#9ef7ff,#1bafff 62%,#1250aa);}
.hs-currency strong{font-size:22px;font-weight:1000;text-align:center;}
.hs-currency i{
  width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-style:normal;
  background:linear-gradient(180deg,#73ff63,#189e31);border:2px solid rgba(255,255,255,.82);
  color:#fff;font-size:28px;font-weight:1000;line-height:1;
}
.hs-currency i svg{width:22px;height:22px;stroke-width:4;}
.hs-currency em{
  position:absolute;left:50%;bottom:-24px;transform:translateX(-50%);
  min-width:78px;padding:3px 12px;border-radius:14px;background:#170422;border:1px solid rgba(216,76,255,.35);
  color:#fff;font-style:normal;font-weight:800;text-align:center;
}
.hs-playerRow{margin-top:18px;display:flex;justify-content:space-between;gap:12px;align-items:center;}
.hs-profile{
  min-width:0;flex:1;max-width:405px;display:flex;align-items:center;gap:16px;
  border-radius:24px;border:1.5px solid rgba(226,74,255,.55);
  background:linear-gradient(180deg,rgba(42,10,66,.82),rgba(18,4,38,.88));
  box-shadow:0 0 24px rgba(151,40,255,.22),inset 0 1px 0 rgba(255,255,255,.13);
  padding:13px 15px;cursor:pointer;color:#fff;text-align:left;
}
.hs-avatar{
  width:80px;height:80px;border-radius:50%;padding:4px;flex-shrink:0;
  background:conic-gradient(#ff58ff,#742bff,#32e6ff,#ff58ff);
  box-shadow:0 0 18px rgba(255,66,235,.62);
}
.hs-avatar span{
  width:100%;height:100%;display:grid;place-items:center;border-radius:50%;
  background:radial-gradient(circle at 35% 25%,#ff97d8,#3e1766 68%,#10021f);
  font-size:31px;font-weight:1000;border:2px solid rgba(255,255,255,.55);
}
.hs-profileText{min-width:0;flex:1;}
.hs-playerName{font-size:25px;font-weight:1000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hs-levelLine{margin-top:7px;display:grid;grid-template-columns:42px 1fr;gap:5px 8px;align-items:center;}
.hs-levelBadge{
  grid-row:1/3;width:42px;height:42px;border-radius:14px;display:grid;place-items:center;
  background:linear-gradient(180deg,#ff67ff,#7d24ec);font-weight:1000;font-size:21px;
  text-shadow:0 2px 4px rgba(0,0,0,.45);box-shadow:0 0 14px rgba(212,61,255,.62);
}
.hs-xpMini{height:14px;border-radius:10px;background:#170421;border:1px solid rgba(255,255,255,.1);overflow:hidden;}
.hs-xpMiniFill{height:100%;background:linear-gradient(90deg,#8a35ff,#ff48d0);box-shadow:0 0 12px #ff48d0;}
.hs-levelLine span:last-child{font-size:16px;font-weight:900;color:#ccefff;}
.hs-actions{display:flex;gap:12px;flex-shrink:0;}
.hs-actionGift,.hs-menu{
  width:78px;height:78px;border-radius:22px;border:1.5px solid rgba(226,74,255,.45);
  background:linear-gradient(180deg,rgba(70,24,102,.95),rgba(20,5,43,.95));
  color:#fff;box-shadow:0 0 20px rgba(151,40,255,.32);cursor:pointer;
}
.hs-actionGift{position:relative;display:grid;place-items:center;}
.hs-actionGift svg,.hs-menu svg{width:38px;height:38px;stroke-width:2.7;filter:drop-shadow(0 0 8px rgba(255,255,255,.28));}
.hs-actionGift b{
  position:absolute;right:-8px;top:-9px;width:35px;height:35px;border-radius:50%;display:grid;place-items:center;
  background:#f02b43;border:2px solid #fff;font-size:20px;font-weight:1000;
}
.hs-menu{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;}
.hs-xpReal{display:none;}
.hs-warn{
  margin-top:12px;padding:10px 14px;border-radius:16px;background:rgba(255,210,61,.12);
  border:1px solid rgba(255,210,61,.28);font-weight:800;color:#ffe9a3;
}
.hs-event{
  position:relative;min-height:244px;margin-top:24px;overflow:hidden;cursor:pointer;
  border-radius:24px;border:1.5px solid rgba(255,52,190,.68);
  background:
    linear-gradient(90deg,rgba(45,3,74,.92),rgba(93,15,96,.5) 48%,rgba(15,4,38,.18)),
    url("${ASSET_BASE}/lobby-event-fiesta-tropical.webp"),
    radial-gradient(circle at 78% 42%,rgba(255,68,202,.72),transparent 30%),
    linear-gradient(135deg,#21063e,#5c1047 50%,#100325);
  background-size:cover;background-position:center;
  box-shadow:0 0 28px rgba(255,47,210,.32),inset 0 1px 0 rgba(255,255,255,.15);
}
.hs-event:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 82% 42%,transparent 0 35%,rgba(0,0,0,.16) 58%);}
.hs-eventCopy{position:relative;z-index:2;padding:24px 28px;}
.hs-eventCopy span{display:block;font-size:20px;font-weight:1000;text-align:center;text-shadow:0 3px 6px #000;}
.hs-eventCopy h1{
  margin:7px 0 14px;max-width:440px;text-align:center;font-size:56px;line-height:.94;font-weight:1000;
  color:#ffd544;text-shadow:0 4px 0 #a11a2f,0 0 20px rgba(255,206,54,.72);
}
.hs-eventTimer{
  display:inline-flex;align-items:center;margin-left:160px;padding:8px 14px;border-radius:17px;
  background:rgba(10,3,24,.82);font-size:19px;font-weight:900;
}
.hs-eventMascots{position:absolute;right:40px;bottom:12px;z-index:2;display:flex;align-items:flex-end;gap:8px;}
.hs-bolla{
  border-radius:50%;display:grid;place-items:center;color:transparent;
  box-shadow:0 20px 35px rgba(0,0,0,.55),inset -13px -16px 26px rgba(0,0,0,.32),0 0 28px rgba(255,63,221,.55);
}
.hs-bolla:before{content:"😎";font-size:.48em;color:#111;filter:drop-shadow(0 0 8px rgba(255,255,255,.5));}
.hs-bollaPurple{width:154px;height:154px;font-size:154px;background:radial-gradient(circle at 32% 24%,#ffb7ff,#a934ff 55%,#55149a);}
.hs-bollaGold{width:112px;height:112px;font-size:112px;background:radial-gradient(circle at 32% 24%,#fff09f,#ffbf23 58%,#c85a0e);}
.hs-playHero{
  position:relative;margin-top:18px;min-height:300px;border-radius:24px;overflow:hidden;
  background:
    linear-gradient(180deg,rgba(8,2,26,.22),rgba(8,2,26,.74)),
    url("${ASSET_BASE}/lobby-play-hero.webp"),
    linear-gradient(135deg,#10042b,#1a0842 50%,#170326);
  background-size:cover;background-position:center;
}
.hs-kingBolla{
  position:absolute;left:20px;bottom:18px;width:190px;height:190px;border-radius:50%;
  background:radial-gradient(circle at 32% 25%,#fff,#f7e9ff 42%,#cf99ff 70%,#7c36d2);
  box-shadow:0 18px 34px rgba(0,0,0,.55),0 0 26px rgba(210,91,255,.52);
}
.hs-kingBolla:before{content:"♛";position:absolute;left:36px;top:-31px;color:#ffd23d;font-size:70px;text-shadow:0 0 13px rgba(255,210,61,.8);}
.hs-kingBolla span{position:absolute;inset:0;display:grid;place-items:center;color:#2c0b4a;font-size:88px;}
.hs-playCopy{position:relative;z-index:2;text-align:center;padding:39px 180px 28px;}
.hs-playCopy h2{font-size:43px;font-weight:1000;text-shadow:0 4px 9px #000;}
.hs-playCopy p{font-size:24px;font-weight:900;color:#ffe157;text-shadow:0 3px 8px #000;}
.hs-playButton{
  margin-top:24px;min-width:410px;border:3px solid rgba(255,255,255,.68);border-radius:30px;
  padding:18px 34px;color:#fff;background:linear-gradient(180deg,#fff176 0,#ffb81f 38%,#e36b00 100%);
  box-shadow:0 0 28px rgba(255,183,23,.72),inset 0 2px 0 rgba(255,255,255,.55),0 10px 22px rgba(0,0,0,.45);
  cursor:pointer;text-shadow:0 3px 6px rgba(114,42,0,.75);
}
.hs-playButton strong{display:block;font-size:50px;font-weight:1000;line-height:.96;}
.hs-playButton span{display:block;font-size:24px;font-weight:900;}
.hs-cityBalls{position:absolute;right:18px;bottom:20px;width:235px;height:210px;}
.hs-wheel{position:absolute;right:34px;top:9px;width:125px;height:125px;border-radius:50%;border:9px solid #fb4bc8;box-shadow:0 0 20px rgba(251,75,200,.7);}
.hs-wheel:before,.hs-wheel:after{content:"";position:absolute;background:#fb4bc8;left:50%;top:0;bottom:0;width:5px;transform:translateX(-50%);}
.hs-wheel:after{transform:translateX(-50%) rotate(90deg);}
.hs-ballPink,.hs-ballBlue{
  position:absolute;bottom:0;width:84px;height:84px;border-radius:50%;display:grid;place-items:center;
  font-size:45px;font-weight:1000;border:3px solid rgba(255,255,255,.55);box-shadow:0 12px 22px rgba(0,0,0,.55);
}
.hs-ballPink{right:86px;background:radial-gradient(circle at 33% 22%,#fff,#ff73c6 48%,#a91275);color:#2c0625;}
.hs-ballBlue{right:10px;background:radial-gradient(circle at 33% 22%,#fff,#3fb9ff 48%,#1046bf);color:#13082a;}
.hs-section{
  margin-top:22px;border-radius:24px;border:1.5px solid rgba(207,58,255,.38);
  background:linear-gradient(180deg,rgba(17,4,43,.74),rgba(12,2,28,.84));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.1);
}
.hs-sectionHead{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px 26px 10px;}
.hs-sectionHead h2{font-size:31px;font-weight:1000;text-shadow:0 3px 7px #000;}
.hs-sectionHead button{
  border:1px solid rgba(255,255,255,.18);border-radius:18px;background:rgba(255,255,255,.07);
  color:#fff;font-size:17px;font-weight:800;padding:8px 18px;cursor:pointer;
}
.hs-roomGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:0 26px 21px;}
.hs-roomCard{
  position:relative;min-height:310px;overflow:hidden;border-radius:22px;padding:30px 20px 19px;
  color:#fff;text-align:center;cursor:pointer;border:1.5px solid rgba(255,55,195,.72);
  background:
    linear-gradient(180deg,rgba(19,4,40,.18),rgba(7,1,20,.93)),
    url("${ASSET_BASE}/lobby-room-bingo-fiesta.webp"),
    radial-gradient(circle at 50% 10%,rgba(255,42,221,.5),transparent 45%),
    #100320;
  background-size:cover;background-position:center;
  box-shadow:0 0 23px rgba(255,55,195,.22),inset 0 1px 0 rgba(255,255,255,.12);
}
.hs-room-1{border-color:rgba(43,165,255,.72);background-image:linear-gradient(180deg,rgba(19,4,40,.18),rgba(7,1,20,.93)),url("${ASSET_BASE}/lobby-room-bingo-90.webp"),radial-gradient(circle at 50% 10%,rgba(43,165,255,.55),transparent 45%);}
.hs-room-2{border-color:rgba(255,116,30,.72);background-image:linear-gradient(180deg,rgba(19,4,40,.18),rgba(7,1,20,.93)),url("${ASSET_BASE}/lobby-room-power-bingo.webp"),radial-gradient(circle at 50% 10%,rgba(255,116,30,.5),transparent 45%);}
.hs-live{
  position:absolute;right:0;top:0;border-radius:0 0 0 12px;background:#e7192c;
  padding:7px 13px;font-size:17px;font-weight:1000;box-shadow:0 0 13px rgba(231,25,44,.65);
}
.hs-roomTitle{
  min-height:104px;display:grid;place-items:center;font-size:45px;line-height:.95;font-weight:1000;
  color:#ff5bd9;text-shadow:0 0 15px currentColor,0 5px 7px #000;
}
.hs-room-1 .hs-roomTitle{color:#39d8ff;}
.hs-room-2 .hs-roomTitle{color:#ffd43d;}
.hs-players{display:inline-flex;padding:8px 14px;border-radius:16px;background:rgba(0,0,0,.55);font-size:18px;font-weight:800;}
.hs-prizeLabel{margin-top:19px;font-size:19px;font-weight:700;}
.hs-prize{margin-top:5px;color:#ffe045;font-size:36px;font-weight:1000;text-shadow:0 0 15px rgba(255,224,69,.55);}
.hs-roomPlay{
  margin:16px auto 0;width:min(100%,250px);border-radius:19px;padding:12px 18px;
  background:linear-gradient(180deg,#d638ff,#7b18df);font-size:28px;font-weight:1000;
  box-shadow:0 0 19px rgba(208,56,255,.7),inset 0 1px 0 rgba(255,255,255,.35);
}
.hs-offers{margin-top:22px;display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.hs-offerCard{
  min-height:230px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;
  padding:26px;border-radius:24px;border:1.5px solid rgba(207,58,255,.52);
  background:
    linear-gradient(90deg,rgba(24,4,52,.94),rgba(58,9,65,.55)),
    url("${ASSET_BASE}/lobby-free-chest.webp"),
    linear-gradient(135deg,#1b043c,#3b0647);
  background-size:cover;background-position:center;color:#fff;cursor:pointer;
  box-shadow:0 0 22px rgba(207,58,255,.18),inset 0 1px 0 rgba(255,255,255,.1);
}
.hs-offerSpecial{background-image:linear-gradient(90deg,rgba(24,4,52,.94),rgba(58,9,65,.55)),url("${ASSET_BASE}/lobby-offer-chest.webp"),linear-gradient(135deg,#1b043c,#3b0647);}
.hs-offerCard h3{font-size:27px;font-weight:1000;}
.hs-offerCard p{margin-top:8px;font-size:22px;font-weight:750;}
.hs-offerCard strong{display:block;margin-top:9px;font-size:28px;}
.hs-offerCard span{
  display:inline-flex;margin-top:50px;border-radius:20px;padding:12px 32px;
  background:linear-gradient(180deg,#ffde52,#f08400);font-size:24px;font-weight:1000;
  box-shadow:0 0 19px rgba(255,164,23,.7);text-shadow:0 2px 5px rgba(111,42,0,.8);
}
.hs-chestArt{font-size:90px;filter:drop-shadow(0 0 20px rgba(255,182,35,.6));}
.hs-missions{padding-bottom:16px;}
.hs-sectionHead h2 b{
  display:inline-grid;place-items:center;width:35px;height:35px;border-radius:50%;
  background:#e7192c;font-size:20px;margin-left:8px;border:2px solid rgba(255,255,255,.65);
}
.hs-missionGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 18px;}
.hs-mission{
  display:grid;grid-template-columns:64px 1fr;align-items:center;gap:12px;min-height:116px;
  border-radius:20px;border:1px solid rgba(255,255,255,.08);
  background:linear-gradient(180deg,rgba(72,14,102,.72),rgba(24,5,50,.85));padding:13px;
}
.hs-missionIcon{grid-row:1/3;width:64px;height:64px;border-radius:16px;display:grid;place-items:center;font-size:38px;background:rgba(0,0,0,.25);}
.hs-missionTitle{font-size:18px;font-weight:800;}
.hs-missionProgress{font-size:14px;font-weight:800;color:#dccfff;}
.hs-missionTrack{height:12px;border-radius:9px;background:#070311;overflow:hidden;}
.hs-missionTrack i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#49e042,#a5ff28);}
.hs-missionReward{grid-column:2;font-size:18px;font-weight:1000;color:#ffd43d;text-align:right;}
.hs-bottomNav{
  margin-top:22px;display:grid;grid-template-columns:repeat(5,1fr);overflow:hidden;
  border-radius:24px;border:1.5px solid rgba(207,58,255,.5);
  background:linear-gradient(180deg,rgba(30,7,60,.95),rgba(10,2,27,.98));
}
.hs-bottomNav button{
  position:relative;min-height:105px;border:0;border-right:1px solid rgba(255,255,255,.07);
  background:transparent;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:8px;font-size:36px;font-weight:1000;cursor:pointer;
}
.hs-bottomNav button svg{width:34px;height:34px;stroke-width:2.8;filter:drop-shadow(0 0 10px rgba(255,255,255,.24));}
.hs-bottomNav button:last-child{border-right:0;}
.hs-bottomNav button.active{background:linear-gradient(180deg,#a72bff,#4d0f99);box-shadow:0 0 25px rgba(167,43,255,.75) inset;}
.hs-bottomNav span{font-size:16px;}
.hs-bottomNav b{
  position:absolute;right:20px;top:14px;min-width:31px;height:31px;border-radius:50%;display:grid;place-items:center;
  background:#e7192c;border:2px solid rgba(255,255,255,.66);font-size:17px;
}
.hs-friends{
  position:relative;min-height:225px;margin-top:29px;border-radius:24px;overflow:hidden;
  border:1.5px solid rgba(207,58,255,.5);
  background:
    linear-gradient(90deg,rgba(26,4,54,.75),rgba(73,12,92,.72)),
    url("${ASSET_BASE}/lobby-friends-banner.webp"),
    linear-gradient(135deg,#13042f,#3b0647);
  background-size:cover;background-position:center;
  display:grid;grid-template-columns:230px 1fr 230px;align-items:end;text-align:center;padding:25px 28px 22px;
}
.hs-friends h2{font-size:31px;font-weight:1000;}
.hs-friends p{margin-top:7px;color:#ffe24e;font-size:26px;line-height:1.16;font-weight:1000;}
.hs-friends button{
  margin-top:16px;border:2px solid rgba(255,255,255,.42);border-radius:24px;
  background:linear-gradient(180deg,#d638ff,#7b18df);padding:12px 32px;color:#fff;
  font-size:25px;font-weight:1000;box-shadow:0 0 19px rgba(208,56,255,.7);cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
}
.hs-friends button svg{width:27px;height:27px;stroke-width:3;}
.hs-friendFaces{display:flex;gap:4px;align-items:flex-end;justify-content:center;font-size:66px;filter:drop-shadow(0 9px 17px rgba(0,0,0,.55));}
.hs-friendFaces.right{font-size:58px;}
.hs-liveCount{
  margin:18px auto 0;display:flex;width:max-content;align-items:center;gap:8px;color:#bda7df;font-size:13px;font-weight:700;
}
.hs-liveCount i{width:9px;height:9px;border-radius:50%;background:#3dde67;box-shadow:0 0 10px #3dde67;}
.hs-toast{
  position:fixed;left:50%;top:50%;z-index:80;transform:translate(-50%,-50%);
  min-width:240px;border-radius:22px;border:1px solid rgba(255,216,80,.42);
  background:linear-gradient(180deg,#2e1456,#14032e);box-shadow:0 18px 45px rgba(0,0,0,.55);
  padding:24px;text-align:center;animation:hsPop .28s cubic-bezier(.2,1.45,.4,1);
}
.hs-toast div{font-size:46px}.hs-toast strong{display:block;font-size:20px}.hs-toast span{display:block;margin-top:3px;color:#d7c8ef;}
@keyframes hsPop{from{opacity:0;transform:translate(-50%,-50%) scale(.82)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@media(min-width:900px){
  .hs-bg{background-image:linear-gradient(180deg,rgba(3,1,12,.55),rgba(5,1,17,.9) 58%,#05020f 100%),url("${ASSET_BASE}/lobby-home-bg-desktop.webp"),radial-gradient(circle at 50% 12%,rgba(110,20,190,.7),transparent 34%),linear-gradient(180deg,#09031d,#140328 46%,#05020f);}
  .hs-top{grid-template-columns:auto 1fr;align-items:start;}
  .hs-wallet{justify-content:flex-end;}
}
@media(max-width:760px){
  .hs-shell{padding:16px 12px 26px;}
  .hs-logoBtn span,.hs-logoBtn strong{font-size:39px;}
  .hs-wallet{gap:8px;}
  .hs-currency{min-width:112px;height:48px;grid-template-columns:34px 1fr 27px;gap:4px;}
  .hs-currencyIcon{width:34px;height:34px;font-size:19px;}
  .hs-currencyIcon svg{width:21px;height:21px;}
  .hs-currency strong{font-size:16px;}
  .hs-currency i{width:26px;height:26px;font-size:22px;}
  .hs-currency i svg{width:17px;height:17px;}
  .hs-playerRow{align-items:stretch;}
  .hs-profile{padding:9px;border-radius:18px;gap:10px;}
  .hs-avatar{width:58px;height:58px;}
  .hs-playerName{font-size:19px;}
  .hs-levelLine{grid-template-columns:32px 1fr;}
  .hs-levelBadge{width:32px;height:32px;font-size:16px;border-radius:10px;}
  .hs-levelLine span:last-child{font-size:12px;}
  .hs-actions{gap:7px;}
  .hs-actionGift,.hs-menu{width:58px;height:58px;border-radius:16px;}
  .hs-actionGift svg,.hs-menu svg{width:29px;height:29px;}
  .hs-event{min-height:195px;border-radius:18px;}
  .hs-eventCopy{padding:16px;}
  .hs-eventCopy span{font-size:14px;}
  .hs-eventCopy h1{font-size:40px;text-align:left;max-width:230px;}
  .hs-eventTimer{margin-left:0;font-size:14px;}
  .hs-eventMascots{right:12px;bottom:9px;}
  .hs-bollaPurple{width:92px;height:92px;font-size:92px;}
  .hs-bollaGold{width:66px;height:66px;font-size:66px;}
  .hs-playHero{min-height:240px;border-radius:18px;}
  .hs-kingBolla{width:104px;height:104px;left:9px;bottom:22px;}
  .hs-kingBolla span{font-size:49px;}
  .hs-kingBolla:before{font-size:40px;left:22px;top:-19px;}
  .hs-playCopy{padding:25px 12px 18px;}
  .hs-playCopy h2{font-size:27px;}
  .hs-playCopy p{font-size:17px;}
  .hs-playButton{min-width:0;width:68%;padding:13px 18px;border-radius:23px;margin-top:18px;}
  .hs-playButton strong{font-size:31px;}
  .hs-playButton span{font-size:16px;}
  .hs-cityBalls{right:0;bottom:12px;width:135px;height:128px;transform:scale(.82);transform-origin:right bottom;}
  .hs-section{border-radius:18px;}
  .hs-sectionHead{padding:14px 15px 8px;}
  .hs-sectionHead h2{font-size:22px;}
  .hs-sectionHead button{font-size:13px;padding:6px 12px;}
  .hs-roomGrid{grid-template-columns:1fr;gap:12px;padding:0 14px 16px;}
  .hs-roomCard{min-height:230px;padding:25px 14px 14px;}
  .hs-roomTitle{font-size:35px;min-height:70px;}
  .hs-players{font-size:14px;}
  .hs-prizeLabel{font-size:15px;margin-top:13px;}
  .hs-prize{font-size:27px;}
  .hs-roomPlay{font-size:21px;width:78%;}
  .hs-offers{grid-template-columns:1fr;gap:12px;}
  .hs-offerCard{min-height:160px;border-radius:18px;padding:17px;}
  .hs-offerCard h3{font-size:21px;}
  .hs-offerCard p{font-size:17px;}
  .hs-offerCard span{font-size:18px;margin-top:24px;padding:10px 22px;}
  .hs-chestArt{font-size:58px;}
  .hs-missionGrid{grid-template-columns:1fr;padding:0 12px;}
  .hs-mission{min-height:94px;}
  .hs-bottomNav{border-radius:18px;}
  .hs-bottomNav button{min-height:78px;font-size:26px;}
  .hs-bottomNav button svg{width:27px;height:27px;}
  .hs-bottomNav span{font-size:12px;}
  .hs-bottomNav b{right:10px;top:8px;min-width:24px;height:24px;font-size:13px;}
  .hs-friends{grid-template-columns:1fr;min-height:240px;padding:18px;border-radius:18px;}
  .hs-friendFaces{display:none;}
  .hs-friends h2{font-size:24px;}
  .hs-friends p{font-size:19px;}
  .hs-friends button{font-size:18px;}
}
`;
