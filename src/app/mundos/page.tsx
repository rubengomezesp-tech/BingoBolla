import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/supabase/types";
import WorldUnlockedToast from "@/components/WorldUnlockedToast";

export const dynamic = "force-dynamic";

const ASSET = "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/world-assets/";
const MASCOT = "https://atfsgvetqxjmmsokswja.supabase.co/storage/v1/object/public/mascot-miami/mascot-miami.PNG";
const MIAMI_MAP = `${ASSET}bg-miami-map.png`;

const fmt = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value));

function normalizeXp(raw: unknown) {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return { level: 1, xp_into_level: 0, xp_needed_level: 100 };
  const xp = row as Record<string, unknown>;
  return {
    level: Number(xp.level ?? 1),
    xp_into_level: Number(xp.xp_into_level ?? 0),
    xp_needed_level: Number(xp.xp_needed_level ?? 100),
  };
}

export default async function MundosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile?.kyc_status || profile.kyc_status === "unverified") redirect("/onboarding");

  const safe = async <T,>(promise: PromiseLike<T>) => {
    try { return await promise; } catch { return { data: null } as any; }
  };

  const [mapResult, xpResult, worldsResult] = await Promise.all([
    safe(supabase.rpc("get_world_map", { p_world_id: "miami_nights" })),
    safe(supabase.rpc("get_player_xp", { p_player_id: user.id })),
    safe(
      supabase
        .from("worlds")
        .select("id, name, ordinal, unlock_level, total_nodes, active")
        .eq("active", true)
        .order("ordinal", { ascending: true })
    ),
  ]);

  const miamiNodes = Array.isArray(mapResult?.data) ? mapResult.data : [];
  const miamiStars = miamiNodes.reduce((sum: number, node: any) => sum + Number(node.stars ?? 0), 0);
  const miamiMax = Math.max(30, miamiNodes.length * 3 || 30);
  const xp = normalizeXp(xpResult?.data);
  const username =
    (profile as any).username ||
    (profile as any).display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "BingoStar";

  // Fallback estático si la tabla worlds aún no tiene los 3 mundos sembrados.
  const FALLBACK_WORLDS = [
    { id: "miami_nights", name: "MIAMI NIGHTS", ordinal: 1, unlock_level: 1 },
    { id: "vegas_lights", name: "VEGAS LIGHTS", ordinal: 2, unlock_level: 5 },
    { id: "tokyo_rush",   name: "TOKYO RUSH",   ordinal: 3, unlock_level: 10 },
  ];
  const dbWorlds = Array.isArray(worldsResult?.data) ? worldsResult.data : [];
  const sourceWorlds = dbWorlds.length >= 3
    ? dbWorlds.map((w: any) => ({
        id: w.id,
        name: String(w.name ?? "").toUpperCase(),
        ordinal: Number(w.ordinal ?? 0),
        unlock_level: Number(w.unlock_level ?? 1),
      }))
    : FALLBACK_WORLDS;

  const worlds = sourceWorlds.slice(0, 3).map((w: any, i: number) => {
    const index = w.ordinal || i + 1;
    const isMiami = w.id === "miami_nights";
    const unlocked = xp.level >= w.unlock_level;
    return {
      index,
      id: w.id,
      name: w.name,
      unlock_level: w.unlock_level,
      stars: isMiami ? miamiStars : 0,
      max: isMiami ? miamiMax : 30,
      href: isMiami && unlocked ? "/mundomiami" : "#",
      active: isMiami && unlocked,
      locked: !unlocked,
    };
  });

  return (
    <div className="mw-root">
      <style>{CSS}</style>
      <WorldUnlockedToast
        level={xp.level}
        worlds={sourceWorlds.map((w: any) => ({
          id: w.id,
          name: w.name,
          unlock_level: w.unlock_level,
        }))}
      />
      <div className="mw-stars" aria-hidden>
        {Array.from({ length: 54 }).map((_, index) => (
          <i
            key={index}
            style={{
              left: `${(index * 37) % 100}%`,
              top: `${(index * 53) % 100}%`,
              animationDelay: `${(index % 8) * 0.28}s`,
            }}
          />
        ))}
      </div>

      <aside className="mw-side">
        <a className="mw-brand" href="/lobby" aria-label="BingoBolla">
          <b>BINGO</b><strong>BOLLA</strong><span>PLAY. WIN. BELONG.</span>
        </a>
        <nav>
          <a href="/lobby" className="on">🏠 INICIO</a>
          <a href="/lobby#salas">🛡 SALAS EN VIVO <em>LIVE</em></a>
          <a href="/eventos">✅ MISIONES <i>2</i></a>
          <a href="/store">🛒 TIENDA</a>
          <a href="/invitar">👥 AMIGOS</a>
          <a href="/eventos">🎁 EVENTOS</a>
          <a href="/mascota">😎 MASCOTA</a>
        </nav>
        <a className="mw-pass" href="/cofres">
          <div>12</div>
          <b>BOLLA PASS</b>
          <span><i style={{ width: "62%" }} /></span>
          <em>VER RECOMPENSAS</em>
        </a>
      </aside>

      <main className="mw-main">
        <header className="mw-hud">
          <a className="mw-profile" href="/account">
            <span>{username.slice(0, 1).toUpperCase()}</span>
            <div><b>{username}</b><em>XP {fmt(xp.xp_into_level)} / {fmt(xp.xp_needed_level)}</em></div>
            <strong>{xp.level}</strong>
          </a>
          <div className="mw-wallet">
            <a href="/store">🪙 {fmt(profile.gold_coins)} <b>+</b></a>
            <a href="/store">💎 {fmt(profile.sweeps_coins)} <b>+</b></a>
            <a href="/store">⚡ 5 <b>+</b><small>01:25</small></a>
          </div>
          <a className="mw-gift" href="/cofres">🎁<i>3</i></a>
          <a className="mw-menu" href="/account">☰</a>
        </header>

        <section className="mw-hero">
          <img src={MIAMI_MAP} alt="" className="mw-map" />
          <div className="mw-heroCopy">
            <h1>BINGO WORLD</h1>
            <p>Viaja por mundos increíbles y gana recompensas.</p>
          </div>

          <div className="mw-route" aria-hidden />
          {worlds.map((world: any) => (
            <a
              key={world.id}
              data-testid={`world-card-${world.id}`}
              href={world.locked ? "#" : world.href}
              onClick={world.locked ? (e) => e.preventDefault() : undefined}
              className={`mw-world mw-w${world.index}${world.locked ? " locked" : ""}`}
              aria-disabled={world.locked ? "true" : undefined}
              aria-label={
                world.locked
                  ? `${world.name} bloqueado. Nivel ${world.unlock_level} requerido.`
                  : world.name
              }
            >
              <span>{world.locked ? "🔒" : world.index}</span>
              <b>{world.name}</b>
              <em data-testid={`world-status-${world.id}`}>
                {world.locked
                  ? `NIVEL ${world.unlock_level} REQUERIDO`
                  : `⭐ ${world.stars} / ${world.max}`}
              </em>
            </a>
          ))}

          <a className="mw-event" href="/eventos">
            <div><span>EVENTO GLOBAL</span><b>FIESTA BINGO</b><em>⭐ 125,000 / 250,000</em></div>
            <img src={MASCOT} alt="" />
          </a>
          <a className="mw-daily" href="/cofres"><strong>🎁</strong><b>COFRE DIARIO</b><span>ABRIR</span></a>
          <a className="mw-playNow" href="/lobby#salas"><b>JUGAR AHORA</b><span>Encuentra salas, gana premios y diviértete.</span></a>
          <nav className="mw-quick">
            <a href="/ranking">🏆<span>RANKING</span></a>
            <a href="/invitar">👥<i>8</i><span>SQUAD</span></a>
            <a href="/cofres">🎁<i>3</i><span>COFRES</span></a>
            <a href="/eventos">🎯<i>2</i><span>MISIONES</span></a>
          </nav>
        </section>

        <section className="mw-games">
          <div className="mw-sectionTitle">BINGO. MINIJUEGOS. RECOMPENSAS. <b>TODO EN UN SOLO LUGAR.</b></div>
          <div className="mw-gameGrid">
            <a href="/lobby#salas" className="mw-game bingo">
              <span>LIVE</span><h2>BINGO CLÁSICO</h2><div className="mw-cardGrid">7 21 42 57 71<br />5 19 38 60 74<br />11 27 ⭐ 54 67</div><b>BINGO!</b><em>75 JUGADORES</em>
            </a>
            <a href="/play/ballmatch?level=1" className="mw-game blast">
              <h2>BOLLA BLAST</h2><div className="mw-orb">B</div><b>PUNTOS: 8,450</b>
            </a>
            <a href="/play/demo" className="mw-game numbers">
              <h2>NUMBERS CHALLENGE</h2><p>Encuentra los números:</p><strong>12 24 36 48</strong><b>RACHA: 12 🔥</b>
            </a>
            <a href="/play/neural-cascade?level=6" className="mw-game merge">
              <h2>BOLLA MERGE</h2><div className="mw-bubbles"><i>2</i><i>4</i><i>16</i></div><b>¡COMBO x4!</b>
            </a>
            <a href="/mundomiami" className="mw-game boss">
              <h2>BOSS BINGO</h2><div className="mw-cardGrid small">12 29 41 56 67<br />8 17 ⭐ 59 72<br />3 25 38 46 70</div><b>75%</b>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700;800&family=Hanken+Grotesk:wght@500;700;800&display=swap');
.mw-root{min-height:100vh;background:#080315;color:#fff;font-family:'Hanken Grotesk',system-ui,sans-serif;position:relative;overflow:hidden;padding-left:292px}
.mw-root *{box-sizing:border-box}.mw-root a{color:inherit;text-decoration:none}
.mw-root:before{content:"";position:fixed;inset:0;background:radial-gradient(90% 70% at 48% 0%,#25105d 0%,#120833 46%,#070313 100%);z-index:0}
.mw-stars{position:fixed;inset:0;z-index:1;pointer-events:none}.mw-stars i{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 12px #ff4dff;animation:tw 2.4s infinite}
@keyframes tw{0%,100%{opacity:.2;transform:scale(.6)}50%{opacity:1;transform:scale(1.5)}}
.mw-side{position:fixed;z-index:5;left:0;top:0;bottom:0;width:292px;padding:28px 24px;background:linear-gradient(180deg,rgba(17,5,47,.95),rgba(9,2,24,.98));border-right:1px solid rgba(255,255,255,.1)}
.mw-brand{display:block;font-family:'Fredoka';font-weight:800;line-height:.86;margin-bottom:26px}.mw-brand b,.mw-brand strong{display:block;font-size:50px}.mw-brand b{color:#fff;text-shadow:0 0 18px #a45bff}.mw-brand strong{color:#ffb323;text-shadow:0 0 18px rgba(255,179,35,.7)}.mw-brand span{display:block;font-size:15px;color:#ffd98a;margin-top:9px;letter-spacing:.05em}
.mw-side nav{display:grid;border:1px solid rgba(164,91,255,.34);border-radius:18px;overflow:hidden;background:rgba(255,255,255,.03)}.mw-side nav a{min-height:48px;display:flex;align-items:center;gap:10px;padding:0 18px;font-weight:900;border-bottom:1px solid rgba(255,255,255,.06)}.mw-side nav a:last-child{border-bottom:0}.mw-side nav a.on{background:linear-gradient(180deg,#b535ff,#7215d6);box-shadow:inset 0 0 18px rgba(255,255,255,.2)}.mw-side nav em,.mw-side nav i{margin-left:auto;background:#ff2449;border-radius:9px;padding:2px 6px;font-size:10px;font-style:normal}
.mw-pass{display:grid;grid-template-columns:78px 1fr;gap:10px;align-items:center;margin-top:14px;padding:14px;border-radius:18px;border:1px solid rgba(255,61,255,.5);background:linear-gradient(180deg,rgba(118,20,186,.7),rgba(47,11,97,.7))}.mw-pass div{grid-row:1/4;width:64px;height:64px;border-radius:18px;display:grid;place-items:center;background:radial-gradient(circle,#ff87ff,#7b2ff7);font-size:32px;font-family:'Fredoka';font-weight:900;box-shadow:0 0 24px rgba(255,77,255,.8)}.mw-pass b{color:#fff27a}.mw-pass span{height:10px;background:rgba(0,0,0,.45);border-radius:99px;overflow:hidden}.mw-pass span i{display:block;height:100%;background:linear-gradient(90deg,#ffd23d,#ff4d9a)}.mw-pass em{justify-self:start;background:#ff9800;color:#fff;border-radius:12px;padding:7px 14px;font-style:normal;font-weight:900;font-size:12px}
.mw-main{position:relative;z-index:2;padding:18px 22px 34px}.mw-hud{height:76px;display:flex;align-items:center;gap:18px;max-width:1250px}.mw-profile{width:292px;height:64px;border-radius:18px;border:1px solid rgba(255,77,255,.45);background:rgba(37,10,78,.8);display:flex;align-items:center;gap:12px;padding:8px 14px}.mw-profile>span{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#ff9ad4,#7b2ff7);font-size:24px;font-weight:900}.mw-profile div{flex:1}.mw-profile b{display:block;font-size:17px}.mw-profile em{display:block;color:#d8c7ef;font-style:normal;font-size:12px}.mw-profile strong{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#b535ff;border:2px solid #fff;font-family:'Fredoka'}
.mw-wallet{display:flex;gap:14px;flex:1}.mw-wallet a{position:relative;min-width:150px;height:50px;border-radius:18px;display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(180deg,rgba(60,13,102,.9),rgba(24,8,57,.92));border:1px solid rgba(255,77,255,.35);font-size:20px;font-weight:900}.mw-wallet b{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#49c828}.mw-wallet small{position:absolute;bottom:-18px;left:50%;transform:translateX(-50%);font-size:12px;color:#fff}
.mw-gift,.mw-menu{width:58px;height:58px;border-radius:16px;display:grid;place-items:center;background:rgba(56,16,88,.9);border:1px solid rgba(255,77,255,.4);font-size:28px;position:relative}.mw-gift i{position:absolute;right:-4px;top:-7px;background:#ff2449;border-radius:50%;width:24px;height:24px;display:grid;place-items:center;font-size:13px;font-style:normal;font-weight:900}.mw-menu{font-size:34px}
.mw-hero{position:relative;min-height:560px;border-radius:0 0 24px 24px;overflow:hidden;background:linear-gradient(180deg,rgba(34,9,86,.45),rgba(12,3,33,.82));box-shadow:inset 0 -1px 0 rgba(255,255,255,.14)}.mw-map{position:absolute;left:-4%;right:0;top:-18%;width:88%;height:104%;object-fit:cover;opacity:.96;filter:saturate(1.2) contrast(1.04)}.mw-heroCopy{position:absolute;left:48px;top:44px;transform:rotate(-7deg);text-shadow:0 0 22px rgba(255,77,255,.85)}.mw-heroCopy h1{font-family:'Fredoka';font-size:58px;line-height:.9;margin:0}.mw-heroCopy p{font-size:20px;font-weight:800;margin-top:8px}
.mw-route{position:absolute;left:120px;top:275px;width:640px;height:128px;border-radius:50%;border-bottom:12px dashed rgba(255,255,255,.92);transform:rotate(6deg);filter:drop-shadow(0 0 10px #ff8b4d)}
.mw-world{position:absolute;width:160px;display:grid;gap:7px;place-items:center;text-align:center;filter:drop-shadow(0 12px 18px rgba(0,0,0,.7));z-index:4}.mw-world span{width:70px;height:70px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 30% 24%,#ff87ff,#7b2ff7 62%,#3a0d72);border:4px solid rgba(255,255,255,.65);font-family:'Fredoka';font-size:36px;font-weight:900;box-shadow:0 0 26px rgba(183,92,255,.9)}.mw-world b{font-family:'Fredoka';font-size:22px}.mw-world em{background:rgba(10,4,25,.82);border:1px solid rgba(255,213,94,.4);border-radius:11px;padding:5px 14px;font-style:normal;font-weight:900}.mw-world.locked{opacity:.82}.mw-world.locked span{background:rgba(15,11,32,.86);box-shadow:0 0 20px rgba(255,255,255,.15)}.mw-world.locked em{color:#9db6ff}.mw-w1{left:100px;bottom:92px}.mw-w2{left:395px;bottom:54px}.mw-w3{left:650px;bottom:120px}
.mw-event{position:absolute;right:190px;top:22px;width:330px;min-height:96px;border-radius:16px;border:1px solid rgba(255,77,255,.42);background:linear-gradient(135deg,rgba(46,12,96,.95),rgba(22,7,55,.94));display:flex;align-items:center;padding:14px 16px;gap:10px}.mw-event span{display:block;color:#fff27a;font-weight:900}.mw-event b{display:block;color:#ffd23d;font-size:21px}.mw-event em{display:block;margin-top:4px;background:rgba(0,0,0,.36);border-radius:999px;padding:4px 10px;font-style:normal}.mw-event img{width:104px;height:104px;object-fit:contain;margin:-18px -10px -12px auto}
.mw-daily{position:absolute;right:18px;top:0;width:156px;height:170px;border-radius:18px;border:1px solid rgba(255,179,35,.8);background:linear-gradient(180deg,rgba(72,26,76,.85),rgba(42,9,39,.94));display:grid;place-items:center;padding:14px;text-align:center}.mw-daily strong{font-size:58px}.mw-daily b{font-size:17px}.mw-daily span{background:linear-gradient(180deg,#ffd55e,#ff8a00);color:#fff;border-radius:16px;padding:10px 28px;font-weight:900}
.mw-playNow{position:absolute;right:48px;bottom:18px;width:458px;height:112px;border-radius:20px;border:1px solid rgba(255,77,255,.65);background:linear-gradient(100deg,rgba(119,28,194,.86),rgba(51,12,97,.86));padding:24px 34px;box-shadow:0 0 28px rgba(255,77,255,.35)}.mw-playNow b{display:block;font-family:'Fredoka';font-size:42px;font-style:italic;text-shadow:0 0 18px rgba(255,255,255,.75)}.mw-playNow span{color:#fff27a;font-weight:900}
.mw-quick{position:absolute;left:220px;bottom:10px;display:flex;border-radius:22px;border:1px solid rgba(255,77,255,.28);background:rgba(8,3,28,.78);overflow:hidden}.mw-quick a{position:relative;width:122px;height:86px;display:grid;place-items:center;font-size:30px;font-weight:900}.mw-quick span{font-size:13px}.mw-quick i{position:absolute;right:20px;top:9px;width:24px;height:24px;border-radius:50%;background:#ff2449;display:grid;place-items:center;font-size:13px;font-style:normal}
.mw-games{margin-top:0;background:linear-gradient(180deg,rgba(10,4,22,.98),rgba(12,4,30,.98));border-radius:22px 22px 0 0;padding:24px 18px;border-top:1px solid rgba(255,255,255,.14)}.mw-sectionTitle{font-family:'Fredoka';font-size:28px;margin:0 0 18px 58px}.mw-sectionTitle b{color:#ffd23d}.mw-gameGrid{display:grid;grid-template-columns:repeat(5,minmax(150px,1fr));gap:12px;max-width:1000px}.mw-game{min-height:260px;border-radius:16px;border:1px solid rgba(255,77,255,.35);background:linear-gradient(180deg,rgba(52,13,88,.75),rgba(12,3,30,.92));padding:14px;text-align:center;position:relative;overflow:hidden}.mw-game h2{font-family:'Fredoka';font-size:18px;color:#fff27a}.mw-game span{position:absolute;right:10px;top:10px;background:#ff153d;border-radius:8px;padding:4px 8px;font-weight:900;font-size:12px}.mw-cardGrid{background:#f8e5cd;color:#170b22;border-radius:10px;font-size:24px;font-weight:900;line-height:1.38;margin:22px 0 12px;padding:10px}.mw-cardGrid.small{font-size:17px}.mw-game>b{display:inline-block;background:linear-gradient(180deg,#e45bff,#7b2ff7);padding:10px 28px;border-radius:14px;font-family:'Fredoka';font-size:18px}.mw-game em{display:block;margin-top:10px;font-style:normal;font-weight:900}.mw-orb{width:118px;height:118px;border-radius:50%;margin:42px auto 28px;display:grid;place-items:center;background:radial-gradient(circle,#ff9dff,#7b2ff7);font-family:'Fredoka';font-size:70px;font-weight:900;box-shadow:0 0 34px #ff4dff}.numbers p{margin:22px 0 12px}.numbers strong{display:block;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:16px;padding:14px;margin-bottom:38px}.mw-bubbles{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:32px 0}.mw-bubbles i{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#ff9dff,#7b2ff7);font-style:normal;font-size:26px;font-weight:900}
@media (max-width:980px){.mw-root{padding-left:0}.mw-side{position:relative;width:auto;height:auto;display:none}.mw-main{padding:10px}.mw-hud{flex-wrap:wrap;height:auto}.mw-wallet{order:2;width:100%;overflow:auto}.mw-wallet a{min-width:130px}.mw-hero{min-height:680px}.mw-map{width:120%;height:72%;top:20px;left:-18%}.mw-heroCopy h1{font-size:42px}.mw-world{transform:scale(.82)}.mw-w1{left:20px;bottom:210px}.mw-w2{left:185px;bottom:170px}.mw-w3{left:330px;bottom:230px}.mw-event{left:18px;right:auto;top:360px;width:300px}.mw-daily{right:12px;top:346px}.mw-playNow{left:18px;right:18px;width:auto;bottom:16px}.mw-quick{left:18px;right:18px;bottom:138px;overflow:auto}.mw-gameGrid{grid-template-columns:1fr 1fr}.mw-sectionTitle{margin-left:0;font-size:22px}}
`;
