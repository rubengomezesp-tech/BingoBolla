"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  COLS_75, ballClass, ballLetter, ball90Class, checkCardStatus,
  type Card as CardType,
} from "@/lib/game/engine";
import { isMuted, setMuted, playBallCalled, playOneToGo, playWin, playPurchase } from "@/lib/sounds";
import type { Profile } from "@/lib/supabase/types";
import { NumberMarker, Confetti } from "@/components/Marker";
import Link from "next/link";
import WinnerOverlay from "@/components/WinnerOverlay";
import JackpotBadge from "@/components/JackpotBadge";

type Ball = { ball_number: number; sequence: number };
type MyCard = { id: string; game_id: string; card_data: CardType; currency: "gold" | "sweeps" };
type ChatMsg = { id: string; player_id: string | null; is_mc: boolean; message: string; created_at: string; username?: string };

type RoomState = {
  room: {
    id: string; name: string; variant: string;
    ticket_gold: number; ticket_sweeps: number;
    max_cards_per_player: number; rtp: number;
    ball_interval_ms: number; schedule_interval_seconds: number;
  } | null;
  playing_game: {
    id: string;
    pot_gold: number; pot_sweeps: number;
    line_won_by: string | null;
    two_lines_won_by: string | null;
    full_house_won_by: string | null;
    starts_at: string;
    balls: Ball[];
  } | null;
  waiting_game: {
    id: string;
    pot_gold: number; pot_sweeps: number;
    starts_at: string;
  } | null;
  my_cards_playing: MyCard[];
  my_cards_waiting: MyCard[];
  chat: ChatMsg[];
  purchase_open: boolean;
  purchase_closes_in_s: number;
};

const CHAT_SHORTCUTS = ["GL all 🍀", "1TG 🎯", "2TG 👀", "WTG 🎉", "TY 💚", "GG 🤝"];

export default function RoomClient({
  initialState,
  initialProfile,
  userId,
}: {
  initialState: RoomState;
  initialProfile: Profile;
  userId: string;
}) {
  const supabase = createClient();
  const room = initialState.room;
  const isB90 = room?.variant === "bingo90";
  const [profile, setProfile] = useState(initialProfile);
  const [state, setState] = useState<RoomState>(initialState);
  const [chatInput, setChatInput] = useState("");
  const [buying, setBuying] = useState(false);
  const [buyingStrip, setBuyingStrip] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [winFlash, setWinFlash] = useState<{ pattern: string; amount: number } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [countdownPlay, setCountdownPlay] = useState<number | null>(null);
  const [countdownClose, setCountdownClose] = useState<number | null>(null);
  const [justMarked, setJustMarked] = useState<Set<string>>(new Set());
  const chatRef = useRef<HTMLDivElement>(null);
  const prevBallsLen = useRef(state.playing_game?.balls?.length ?? 0);
  const prev1TG = useRef<Set<string>>(new Set());
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const refetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const playingGameId = state.playing_game?.id ?? null;
  const waitingGameId = state.waiting_game?.id ?? null;
  const balls = state.playing_game?.balls ?? [];

  const calledSet = useMemo(() => new Set(balls.map((b) => b.ball_number)), [balls]);
  const lastBall = balls.length ? balls[balls.length - 1] : null;

  const cardStatuses = useMemo(() => {
    const m: Record<string, ReturnType<typeof checkCardStatus>> = {};
    for (const c of state.my_cards_playing ?? []) {
      m[c.id] = checkCardStatus(c.card_data, calledSet);
    }
    return m;
  }, [state.my_cards_playing, calledSet]);

  useEffect(() => { setMutedState(isMuted()); }, []);

  async function refetch() {
    if (!room?.id) return;
    const { data, error } = await supabase.rpc("get_room_state", { p_room_id: room.id });
    if (!error && data) setState(data as RoomState);
  }

  // Realtime
  useEffect(() => {
    if (!room?.id) return;
    const channel = supabase
      .channel(`room:${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `room_id=eq.${room.id}` },
        () => { scheduleRefetch(100); }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "balls_called" },
        (p) => {
          const b = p.new as Ball & { game_id: string };
          if (b.game_id === playingGameId) scheduleRefetch(50);
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cards" },
        () => { scheduleRefetch(200); }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" },
        () => { scheduleRefetch(100); }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "claims" },
        (p) => {
          const c = p.new as any;
          if (c.valid && c.player_id === userId) {
            const amount = Number(c.prize_sweeps) > 0 ? Number(c.prize_sweeps) : c.prize_gold;
            setWinFlash({ pattern: c.pattern, amount });
            setConfettiTrigger(Date.now());
            playWin();
            setTimeout(() => setWinFlash(null), 5000);
          }
          scheduleRefetch(100);
        }
      )
      .subscribe();

    function scheduleRefetch(delay: number) {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      refetchTimerRef.current = setTimeout(refetch, delay);
    }

    return () => { supabase.removeChannel(channel); };
  }, [room?.id, playingGameId, userId]);

  // Polling de respaldo
  useEffect(() => {
    if (!room?.id) return;
    const id = setInterval(refetch, 8000);
    return () => clearInterval(id);
  }, [room?.id]);

  // TICK cada 3 segundos (envía room_id)
  useEffect(() => {
    if (!room?.id) return;
    const tick = async () => {
      try {
        await fetch("/api/game/tick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_id: room.id }),
        });
      } catch (err) {
        console.error("Tick error:", err);
      }
    };
    tickIntervalRef.current = setInterval(tick, 3000);
    tick();
    return () => { if (tickIntervalRef.current) clearInterval(tickIntervalRef.current); };
  }, [room?.id]);

  // Sonidos y marcado visual
  useEffect(() => {
    if (balls.length > prevBallsLen.current) {
      const newBall = balls[balls.length - 1];
      if (newBall) {
        playBallCalled(newBall.ball_number);
        const newMarks = new Set<string>();
        for (const c of state.my_cards_playing ?? []) {
          for (let r = 0; r < c.card_data.length; r++) {
            for (let cc = 0; cc < c.card_data[r].length; cc++) {
              if (c.card_data[r][cc] === newBall.ball_number) newMarks.add(`${c.id}-${r}-${cc}`);
            }
          }
        }
        if (newMarks.size > 0) {
          setJustMarked(newMarks);
          setTimeout(() => setJustMarked(new Set()), 600);
        }
      }
    }
    prevBallsLen.current = balls.length;

    const new1TG = new Set<string>();
    for (const c of state.my_cards_playing ?? []) {
      const s = cardStatuses[c.id];
      if (s && s.to_line === 1) new1TG.add(c.id);
    }
    for (const id of new1TG) {
      if (!prev1TG.current.has(id)) { playOneToGo(); break; }
    }
    prev1TG.current = new1TG;
  }, [balls, state.my_cards_playing, cardStatuses]);

  // Countdowns
  useEffect(() => {
    if (!state.waiting_game) { setCountdownPlay(null); setCountdownClose(null); return; }
    const target = new Date(state.waiting_game.starts_at).getTime();
    const tick = () => {
      const ms = target - Date.now();
      setCountdownPlay(Math.max(0, Math.floor(ms / 1000)));
      setCountdownClose(Math.max(0, Math.floor((ms - 5000) / 1000)));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [state.waiting_game]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [state.chat]);

  async function refreshProfile() {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single<Profile>();
    if (data) setProfile(data);
  }

  const playing = !!state.playing_game;
  const waiting = !!state.waiting_game;
  const hasPlayingCards = (state.my_cards_playing?.length ?? 0) > 0;
  const hasWaitingCards = (state.my_cards_waiting?.length ?? 0) > 0;
  const purchaseOpen = state.purchase_open && !!waiting;

  let mode: "live" | "spectator-queue" | "spectator-locked" | "buy" | "wait-with-cards";
  if (playing && hasPlayingCards) mode = "live";
  else if (playing && waiting && purchaseOpen) mode = "spectator-queue";
  else if (playing && (!waiting || !purchaseOpen)) mode = "spectator-locked";
  else if (!playing && hasWaitingCards) mode = "wait-with-cards";
  else mode = "buy";

  async function buyTicket(currency: "gold" | "sweeps") {
    if (!room?.id) return;
    setBuying(true);
    const { data, error } = await supabase.rpc("buy_ticket", { p_room_id: room.id, p_currency: currency });
    setBuying(false);
    if (error) {
      setToast({ ok: false, text: errorLabel(error.message) });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    if (data) {
      playPurchase();
      await Promise.all([refetch(), refreshProfile()]);
      setToast({ ok: true, text: "✅ Cartón comprado" });
      setTimeout(() => setToast(null), 3000);
    }
  }

  async function buyStrip(currency: "gold" | "sweeps") {
    if (!room?.id) return;
    setBuyingStrip(true);
    const { data, error } = await supabase.rpc("buy_strip", { p_room_id: room.id, p_currency: currency });
    setBuyingStrip(false);
    if (error) {
      setToast({ ok: false, text: errorLabel(error.message) });
      setTimeout(() => setToast(null), 4000);
      return;
    }
    if (data) {
      playPurchase();
      await Promise.all([refetch(), refreshProfile()]);
      setToast({ ok: true, text: "🎫 Tira de 6 cartones · -15%" });
      setTimeout(() => setToast(null), 4000);
    }
  }

  async function sendChat(text?: string) {
    const message = (text ?? chatInput).trim();
    const gameId = playingGameId ?? waitingGameId;
    if (!message || !gameId) return;
    setChatInput("");
    await supabase.from("chat_messages").insert({ game_id: gameId, player_id: userId, message: message.slice(0, 200) });
  }

  function toggleMute() {
    const v = !muted; setMuted(v); setMutedState(v);
  }

  const totalBalls = isB90 ? 90 : 75;

  if (!room) return <div className="p-8 text-center">Cargando sala...</div>;

  // Jugadores "conectados" derivados del chat (datos reales disponibles)
  const chatPlayers = (() => {
    const seen = new Map<string, string>();
    for (let i = (state.chat?.length ?? 0) - 1; i >= 0; i--) {
      const m = state.chat[i];
      if (m.username && !seen.has(m.username)) seen.set(m.username, m.message);
      if (seen.size >= 6) break;
    }
    return Array.from(seen.entries()).map(([name, msg]) => ({ name, msg }));
  })();
  const onlineCount = Math.max(chatPlayers.length, (state.chat?.length ?? 0) > 0 ? 12 : 1);

  return (
    <div className="rm-root">
      <style>{RM_CSS}</style>
      {confettiTrigger > 0 && <Confetti trigger={confettiTrigger} />}
      <WinnerOverlay gameId={playingGameId} />

      {/* ===== Top bar ===== */}
      <div className="rm-top">
        <Link href="/lobby" className="rm-iconbtn" aria-label="Volver">‹</Link>
        <div className="rm-rname">
          <div className="rm-n">{room.name}</div>
          <div className="rm-s">{isB90 ? "Bingo 90" : "Bingo 75"}</div>
        </div>
        <Link href="/store" className="rm-cur">
          <span>🪙</span>
          <span className="rm-a">{profile.gold_coins.toLocaleString()}</span>
          <span className="rm-p">+</span>
        </Link>
        <Link href="/store" className="rm-cur rm-mag">
          <span>💎</span>
          <span className="rm-a">{profile.sweeps_coins.toFixed(2)}</span>
          <span className="rm-p">+</span>
        </Link>
        <button onClick={toggleMute} className="rm-iconbtn rm-set">{muted ? "🔇" : "🔊"}</button>
      </div>

      {/* ===== Status pills ===== */}
      <div className="rm-status">
        <div className="rm-pill">
          {playing ? (
            <><span className="rm-dot" />EN&nbsp;JUEGO <b>{balls.length}/{totalBalls}</b></>
          ) : (
            <>⏰ EMPIEZA <b>{formatCountdown(countdownPlay)}</b></>
          )}
        </div>
        <div className="rm-pill rm-bote">
          🎰 BOTE <span className="rm-v">${Number(state.playing_game?.pot_sweeps ?? state.waiting_game?.pot_sweeps ?? 0).toFixed(2)}</span>
        </div>
        {room && (
          <div className="rm-pill rm-jp">
            <div className="rm-jl">💰 JACKPOT</div>
            <div className="rm-jv"><JackpotBadge roomId={room.id} compact /></div>
          </div>
        )}
      </div>

      {/* ===== Balls strip ===== */}
      {playing && (
        <div className="rm-ballstrip">
          <div className="rm-bsLbl">
            <div className="rm-bsT">BOLAS<br />LLAMADAS</div>
            <div className="rm-bsC">{balls.length}</div>
          </div>
          <div className="rm-bsBalls">
            {balls.slice(-14).reverse().map((b) => (
              <div
                key={b.sequence}
                className={`rm-mini ${b.sequence === lastBall?.sequence ? "rm-hot" : ""}`}
                style={{ "--bc": getBallColor(b.ball_number, isB90) } as any}
              >
                {b.ball_number}
              </div>
            ))}
            {balls.length === 0 && <div className="rm-bsEmpty">Esperando primera bola…</div>}
          </div>
        </div>
      )}

      {/* ===== Next/last ball big ===== */}
      {playing && lastBall && (
        <div className="rm-nextball" key={lastBall.sequence}>
          <div className="rm-nbL">ÚLTIMA BOLA</div>
          <div className="rm-nbBall" style={{ "--bc": getBallColor(lastBall.ball_number, isB90) } as any}>
            {!isB90 && <span className="rm-nbLetter">{ballLetter(lastBall.ball_number)}</span>}
            {lastBall.ball_number}
          </div>
        </div>
      )}

      {/* ===== Stage ===== */}
      <div className="rm-stage">
        <div className="rm-stageGlow" />
        <div className="rm-arch" />
        <div className="rm-stageLogo">
          <div className="rm-cr">👑</div>
          <div className="rm-l1">BINGO</div>
          <div className="rm-l2">BOLLA</div>
        </div>
        <div className="rm-stageFloor" />
        <div className="rm-booth" />

        {/* Players (from chat activity) */}
        <div className="rm-players">
          <div className="rm-pHd">
            <div className="rm-pT">JUGADORES</div>
            <div className="rm-pC">{onlineCount}</div>
            <div className="rm-pS">en sala</div>
          </div>
          {chatPlayers.length === 0 && (
            <div className="rm-pEmpty">Sé el primero 👋</div>
          )}
          {chatPlayers.slice(0, 5).map((p, i) => (
            <div className="rm-pl" key={i}>
              <div className="rm-plAv">{p.name?.[0]?.toUpperCase() ?? "?"}</div>
              <div className="rm-plInfo">
                <div className="rm-plNm">{p.name}</div>
                <div className="rm-plSt">jugando</div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat (real state.chat) */}
        <div className="rm-chat">
          <div className="rm-chatHd">
            <span className="rm-chatDot" />CHAT EN VIVO
          </div>
          <div className="rm-chatBody" ref={chatRef}>
            {(!state.chat || state.chat.length === 0) ? (
              <div className="rm-chatEmpty">Sé el primero en saludar 👋</div>
            ) : (
              state.chat.map((m) => (
                <div className="rm-msg" key={m.id}>
                  <div className="rm-msgAv">{m.username?.[0]?.toUpperCase() ?? "?"}</div>
                  <div className="rm-msgBd">
                    <div className="rm-msgNm">{m.username ?? "?"}</div>
                    <div className="rm-msgTx">{m.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="rm-chatShort">
            {CHAT_SHORTCUTS.map((s) => (
              <button key={s} onClick={() => sendChat(s)} className="rm-sc">{s}</button>
            ))}
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); sendChat(); }}
            className="rm-chatin"
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Escribe aquí..."
              maxLength={200}
              className="rm-chatInput"
            />
            <button type="submit" className="rm-chatSend">→</button>
          </form>
        </div>
      </div>

      {/* ===== Win status + extras ===== */}
      {playing && state.playing_game && (
        <div className="rm-winrow">
          <PrizeIndicator label="LÍNEA" won={!!state.playing_game.line_won_by} active={!state.playing_game.line_won_by} />
          {isB90 ? (
            <PrizeIndicator label="DOBLE" won={!!state.playing_game.two_lines_won_by} active={!!state.playing_game.line_won_by && !state.playing_game.two_lines_won_by} />
          ) : (
            <PrizeIndicator label="—" won={false} active={false} />
          )}
          <PrizeIndicator label="BINGO" won={!!state.playing_game.full_house_won_by} active={(isB90 ? !!state.playing_game.two_lines_won_by : !!state.playing_game.line_won_by) && !state.playing_game.full_house_won_by} />
        </div>
      )}

      {/* ===== Mode banner ===== */}
      <ModeBanner
        mode={mode}
        countdownPlay={countdownPlay}
        countdownClose={countdownClose}
        myCardsWaiting={state.my_cards_waiting?.length ?? 0}
      />

      {/* ===== Buy panel ===== */}
      {(mode === "buy" || mode === "spectator-queue" || mode === "wait-with-cards") && state.waiting_game && (
        <div className={`rm-buypanel ${purchaseOpen ? "rm-buyOpen" : "rm-buyClosed"}`}>
          <div className="rm-buyHd">
            <div className="rm-buyTtl">{hasWaitingCards ? "Comprar más cartones" : "Comprar cartón"}</div>
            <div className="rm-buySub">
              {hasWaitingCards && `${state.my_cards_waiting.length}/${room.max_cards_per_player} en cola`}
              {!purchaseOpen && (
                <span className="rm-buyWarn">{hasWaitingCards ? " · " : ""}⏰ Cerrada · {formatCountdown(countdownPlay)}</span>
              )}
              {purchaseOpen && (countdownClose ?? 99) < 10 && (
                <span className="rm-buyClose"> · Cierra en {countdownClose}s</span>
              )}
            </div>
          </div>
          <div className="rm-buyBtns">
            <button onClick={() => buyTicket("gold")} disabled={buying || !purchaseOpen || profile.gold_coins < room.ticket_gold} className="rm-bg">🪙 {room.ticket_gold}</button>
            <button onClick={() => buyTicket("sweeps")} disabled={buying || !purchaseOpen || profile.sweeps_coins < room.ticket_sweeps} className="rm-bs">💎 ${room.ticket_sweeps}</button>
          </div>
          {isB90 && purchaseOpen && (state.my_cards_waiting.length + 6) <= room.max_cards_per_player && (
            <div className="rm-strip">
              <div className="rm-stripL">
                🎫 Tira de 6 <span className="rm-stripBadge">-15%</span>
                <div className="rm-stripSub">Cobertura de los 90 números</div>
              </div>
              <div className="rm-buyBtns">
                <button onClick={() => buyStrip("gold")} disabled={buyingStrip} className="rm-bg">🪙 {Math.round(room.ticket_gold * 6 * 0.85)}</button>
                <button onClick={() => buyStrip("sweeps")} disabled={buyingStrip} className="rm-bs">💎 ${(room.ticket_sweeps * 6 * 0.85).toFixed(2)}</button>
              </div>
            </div>
          )}
          {(profile.gold_coins < room.ticket_gold && profile.sweeps_coins < room.ticket_sweeps) && (
            <Link href="/store" className="rm-needcoins">Te faltan coins · Visita la tienda →</Link>
          )}
        </div>
      )}

      {/* ===== Waiting cards ===== */}
      {state.my_cards_waiting?.length > 0 && (
        <div className="rm-section rm-waiting">
          <div className="rm-secHd">
            <div>
              <div className="rm-secKick">⏱️ En cola</div>
              <div className="rm-secTtl">{state.my_cards_waiting.length} cartones listos</div>
            </div>
            <div className="rm-secRight">
              <div className="rm-secK">Empieza en</div>
              <div className="rm-secCd">{formatCountdown(countdownPlay)}</div>
            </div>
          </div>
          <div className="rm-cards">
            {state.my_cards_waiting.slice(0, 4).map((card, idx) => (
              isB90 ? (
                <Card90 key={card.id} card={card} status={undefined} calledSet={new Set()} index={idx} justMarked={new Set()} />
              ) : (
                <Card75 key={card.id} card={card} status={undefined} calledSet={new Set()} index={idx} justMarked={new Set()} />
              )
            ))}
          </div>
          {state.my_cards_waiting.length > 4 && <div className="rm-more">+{state.my_cards_waiting.length - 4} más</div>}
        </div>
      )}

      {/* ===== Playing cards ===== */}
      {state.my_cards_playing?.length > 0 && (
        <div className="rm-cards rm-cardsMain">
          {state.my_cards_playing.map((card, idx) => (
            isB90 ? (
              <Card90 key={card.id} card={card} status={cardStatuses[card.id]} calledSet={calledSet} index={idx} justMarked={justMarked} />
            ) : (
              <Card75 key={card.id} card={card} status={cardStatuses[card.id]} calledSet={calledSet} index={idx} justMarked={justMarked} />
            )
          ))}
        </div>
      )}

      {/* ===== Win flash ===== */}
      {winFlash && (
        <div className="rm-winflash">
          <div className="rm-wfText">
            <div className="rm-wfBig">¡BINGO!</div>
            <div className="rm-wfSub">{winFlash.pattern.replace("_", " ").toUpperCase()} · ${winFlash.amount.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div className={`rm-toast ${toast.ok ? "rm-toastOk" : "rm-toastErr"}`}>{toast.text}</div>
      )}

      {/* ===== Bottom action bar ===== */}
      <div className="rm-actionbar">
        <Link href="/lobby" className="rm-abtn"><span className="rm-abI">🚪</span>SALIR</Link>
        <button
          className="rm-buybig"
          onClick={() => {
            if (purchaseOpen) buyTicket("sweeps");
            else setToast({ ok: false, text: "⏰ Ventana de compra cerrada" });
          }}
          disabled={buying}
        >
          <span className="rm-bbSh" />
          🛒 <div>COMPRAR<div className="rm-bbSub">MÁS CARTONES</div></div>
        </button>
        <Link href="/lobby" className="rm-abtn"><span className="rm-abI">📊</span>{isB90 ? "B90" : "B75"}</Link>
      </div>
    </div>
  );
}

function ModeBanner({ mode, countdownPlay, countdownClose, myCardsWaiting }: any) {
  const content = (() => {
    switch (mode) {
      case "live": return { emoji: "🎯", title: "¡Tu partida está en curso!", subtitle: "Las bolas se marcan automáticamente", color: "emerald" };
      case "spectator-queue": return { emoji: "👀", title: "Mirando partida en curso", subtitle: `Compra para la siguiente · Ventana cierra en ${countdownClose ?? "?"}s`, color: "cyan" };
      case "spectator-locked": return { emoji: "⏰", title: "Ventana cerrada", subtitle: `Próxima ronda en ${formatCountdown(countdownPlay)}`, color: "gold" };
      case "wait-with-cards": return { emoji: "⏱️", title: `${myCardsWaiting} cartones listos`, subtitle: `Empieza en ${formatCountdown(countdownPlay)}`, color: "cyan" };
      default: return { emoji: "🎫", title: "Compra tu cartón", subtitle: `La ronda empieza en ${formatCountdown(countdownPlay)}`, color: "magenta" };
    }
  })();
  return (
    <div className={`rm-modebanner rm-mb-${content.color}`}>
      <div className="rm-mbEmoji">{content.emoji}</div>
      <div>
        <div className="rm-mbTitle">{content.title}</div>
        <div className="rm-mbSub">{content.subtitle}</div>
      </div>
    </div>
  );
}

function PrizeIndicator({ label, won, active }: any) {
  return (
    <div className={`rm-prize ${won ? "rm-prizeWon" : active ? "rm-prizeActive" : ""}`}>
      <div className="rm-prizeL">{label}</div>
      <div className="rm-prizeV">{won ? "✓" : active ? "···" : "—"}</div>
    </div>
  );
}

function Card75({ card, status, calledSet, index, justMarked }: any) {
  const toLine = status?.to_line ?? 99;
  const won = status?.full_house;
  const tag = won ? { text: "¡BINGO!", color: "from-amber-400 to-pink-500" } : status?.line ? { text: "Línea ✓", color: "from-green-500 to-cyan-400" } : toLine === 1 ? { text: "1TG", color: "from-pink-500 to-amber-400", anim: true } : toLine === 2 ? { text: "2TG", color: "from-purple-400 to-pink-500" } : null;
  const headerCls: any = { B: "bb-ball--b", I: "bb-ball--i", N: "bb-ball--n", G: "bb-ball--g", O: "bb-ball--o" };
  return <div className="rm-card" style={{ animationDelay: `${index * 0.08}s` }}>
    <div className="rm-cardHd"><div className="rm-cardN">Cartón #{index + 1} <span className="rm-cardRf">↻</span></div>{tag && <div className={`rm-cardTag bg-gradient-to-r ${tag.color} ${tag.anim ? "animate-pulse" : ""}`}>{tag.text}</div>}</div>
    <div className="rm-cardGrid">{COLS_75.map((l: string) => <div key={l} className={`rm-gh ${headerCls[l]}`}><span>{l}</span></div>)}</div>
    <div className="rm-cardGrid rm-cardNums">
      {card.card_data.flatMap((row: any[], r: number) => row.map((val: any, c: number) => {
        const isMarked = val === "FREE" || (typeof val === "number" && calledSet.has(val));
        const key = `${card.id}-${r}-${c}`;
        const isJust = justMarked.has(key);
        const color = ["#FF3D7F", "#FFD93D", "#00E5FF", "#B388FF", "#00E676"][c];
        return <div key={key} className={`rm-gn ${isMarked ? "rm-gnMarked" : ""} ${isJust ? "rm-gnJust" : ""} ${val === "FREE" ? "rm-gnFree" : ""}`}>
          <span className={isMarked && val !== "FREE" ? "rm-gnTxt" : ""}>{val === "FREE" ? "★" : val}</span>
          <NumberMarker color={color} visible={!!isMarked && val !== "FREE"} />
        </div>;
      }))}
    </div>
    <button className="rm-cardBingo">BINGO</button>
  </div>;
}

function Card90({ card, status, calledSet, index, justMarked }: any) {
  const toLine = status?.to_line ?? 99;
  const won = status?.full_house;
  const tag = won ? { text: "¡BINGO!", color: "from-amber-400 to-pink-500" } : status?.two_lines ? { text: "Doble ✓", color: "from-cyan-400 to-purple-400" } : status?.line ? { text: "Línea ✓", color: "from-green-500 to-cyan-400" } : toLine === 1 ? { text: "1TG", color: "from-pink-500 to-amber-400", anim: true } : toLine === 2 ? { text: "2TG", color: "from-purple-400 to-pink-500" } : null;
  return <div className="rm-card rm-card90" style={{ animationDelay: `${index * 0.05}s` }}>
    <div className="rm-cardHd"><div className="rm-cardN">Cartón #{index + 1} <span className="rm-cardRf">↻</span></div>{tag && <div className={`rm-cardTag bg-gradient-to-r ${tag.color} ${tag.anim ? "animate-pulse" : ""}`}>{tag.text}</div>}</div>
    <div className="rm-card90Grid">
      {card.card_data.flatMap((row: any[], r: number) => row.map((val: any, c: number) => {
        const isEmpty = val == null;
        const isMarked = !isEmpty && typeof val === "number" && calledSet.has(val);
        const key = `${card.id}-${r}-${c}`;
        const isJust = justMarked.has(key);
        const color = ["#FF3D7F","#FFD93D","#00E5FF","#B388FF","#00E676","#FF3D7F","#FFD93D","#00E5FF","#B388FF"][c];
        return <div key={key} className={`rm-gn ${isEmpty ? "rm-gnEmpty" : ""} ${isMarked ? "rm-gnMarked" : ""} ${isJust ? "rm-gnJust" : ""}`}>
          {!isEmpty && <><span className={isMarked ? "rm-gnTxt" : ""}>{val}</span><NumberMarker color={color} visible={isMarked} /></>}
        </div>;
      }))}
    </div>
    <button className="rm-cardBingo">BINGO</button>
  </div>;
}

function formatCountdown(s: number | null) { if (s == null) return "—"; const m = Math.floor(s / 60); const sec = s % 60; return `${m}:${sec.toString().padStart(2, "0")}`; }
function getBallColor(n: number, is90: boolean): string { if (is90) { if (n <= 9) return "#FF3D7F"; if (n <= 19) return "#FFD93D"; if (n <= 29) return "#00E5FF"; if (n <= 39) return "#B388FF"; if (n <= 49) return "#00E676"; if (n <= 59) return "#FF3D7F"; if (n <= 69) return "#FFD93D"; if (n <= 79) return "#00E5FF"; return "#B388FF"; } return n <= 15 ? "#FF3D7F" : n <= 30 ? "#FFD93D" : n <= 45 ? "#00E5FF" : n <= 60 ? "#B388FF" : "#00E676"; }
function errorLabel(msg: string): string { const map: any = { purchase_window_closed: "⏰ Ventana cerrada", insufficient_funds: "Te faltan monedas", kyc_required: "Verificación pendiente", state_excluded: "Estado no permitido", max_cards_reached: "Máximo cartones", game_not_active: "Partida no activa", account_banned: "Cuenta suspendida", self_excluded: "Autoexcluido", strips_only_for_bingo90: "Solo Bingo 90" }; for (const k of Object.keys(map)) if (msg.includes(k)) return map[k]; return msg; }

const RM_CSS = `
.rm-root{position:relative;min-height:100vh;padding-bottom:100px;overflow-x:hidden;
  background:linear-gradient(180deg,#160a32 0%,#0e0420 60%,#0a0418 100%);
  font-family:'Fredoka',ui-rounded,system-ui,sans-serif;color:#fff;
  max-width:560px;margin:0 auto;}
.rm-top{display:flex;align-items:center;gap:8px;padding:14px 12px 8px;
  position:sticky;top:0;z-index:30;backdrop-filter:blur(14px);
  background:linear-gradient(180deg,rgba(22,10,50,.9),rgba(14,4,32,.7));}
.rm-iconbtn{width:44px;height:44px;border-radius:12px;flex-shrink:0;
  background:linear-gradient(180deg,#7a3ad0,#4a1a8a);display:flex;
  align-items:center;justify-content:center;font-size:20px;border:none;
  color:#fff;text-decoration:none;cursor:pointer;
  box-shadow:0 4px 12px rgba(120,50,200,.5);}
.rm-set{background:linear-gradient(180deg,#5a3ad0,#3a1a8a);}
.rm-rname{flex:1;min-width:0;}
.rm-n{font-weight:800;font-size:20px;line-height:1;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;}
.rm-s{font-size:12px;color:#b9a0e0;margin-top:2px;}
.rm-cur{display:flex;align-items:center;gap:5px;text-decoration:none;color:#fff;
  background:linear-gradient(180deg,rgba(50,28,90,.85),rgba(28,14,56,.9));
  border:1px solid rgba(170,120,255,.3);border-radius:18px;
  padding:5px 5px 5px 10px;}
.rm-cur.rm-mag{border-color:rgba(255,60,180,.35);}
.rm-a{font-weight:800;font-size:12px;}
.rm-p{width:20px;height:20px;border-radius:50%;
  background:linear-gradient(180deg,#3ddc6a,#1fa84a);display:flex;
  align-items:center;justify-content:center;font-weight:800;font-size:14px;}
.rm-status{display:flex;gap:8px;padding:8px 12px 10px;}
.rm-pill{border-radius:12px;padding:9px 13px;display:flex;align-items:center;
  gap:7px;font-size:12px;font-weight:600;
  background:linear-gradient(180deg,rgba(40,22,75,.8),rgba(22,12,46,.85));
  border:1px solid rgba(170,120,255,.22);}
.rm-dot{width:8px;height:8px;border-radius:50%;background:#3ddc6a;
  box-shadow:0 0 8px #3ddc6a;animation:rmTw 1.5s infinite;}
@keyframes rmTw{0%,100%{opacity:.3}50%{opacity:1}}
.rm-pill b{color:#3ddc6a;font-weight:800;}
.rm-bote{flex:1;justify-content:center;border-color:rgba(255,200,80,.3);}
.rm-bote .rm-v{color:#ffd23d;font-weight:800;}
.rm-jp{flex:1.2;flex-direction:column;align-items:flex-start;gap:2px;
  background:linear-gradient(135deg,#4a2a08,#3a1a6e);
  border-color:rgba(255,200,80,.35);}
.rm-jl{font-size:9px;letter-spacing:.12em;color:#ffd8a0;}
.rm-jv{font-weight:800;font-size:15px;color:#ffd23d;}
.rm-ballstrip{margin:0 12px 10px;border-radius:16px;padding:11px;
  display:flex;align-items:center;gap:10px;
  background:linear-gradient(180deg,rgba(40,22,75,.7),rgba(22,12,46,.8));
  border:1px solid rgba(170,120,255,.2);}
.rm-bsLbl{text-align:center;flex-shrink:0;}
.rm-bsT{font-size:8px;letter-spacing:.08em;color:#b9a0e0;line-height:1.1;}
.rm-bsC{width:42px;height:42px;border-radius:50%;margin-top:4px;
  background:linear-gradient(135deg,#9a5ad0,#5a2aa8);display:flex;
  align-items:center;justify-content:center;font-weight:800;font-size:17px;
  border:2px solid rgba(255,255,255,.15);}
.rm-bsBalls{flex:1;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;}
.rm-bsBalls::-webkit-scrollbar{display:none;}
.rm-mini{width:36px;height:36px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-weight:800;
  font-size:13px;color:#c9b8e8;
  background:radial-gradient(circle at 35% 30%,#3a2a5a,#1a1030);
  border:1.5px solid rgba(255,255,255,.1);}
.rm-mini.rm-hot{color:#fff;
  background:radial-gradient(circle at 35% 30%,var(--bc),#000);
  border-color:#fff;box-shadow:0 0 14px var(--bc);}
.rm-bsEmpty{font-size:12px;color:#9a7ac8;font-style:italic;}
.rm-nextball{position:absolute;right:14px;top:188px;text-align:center;z-index:6;}
.rm-nbL{font-size:8px;letter-spacing:.1em;color:#b9a0e0;margin-bottom:5px;}
.rm-nbBall{width:80px;height:80px;border-radius:50%;
  background:radial-gradient(circle at 35% 28%,var(--bc),#000 130%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-weight:800;font-size:34px;color:#fff;
  border:3px solid rgba(255,255,255,.25);
  box-shadow:0 8px 24px rgba(0,0,0,.5),0 0 26px var(--bc);
  animation:rmPulse 2s ease-in-out infinite;}
.rm-nbLetter{font-size:13px;opacity:.7;margin-bottom:-4px;}
@keyframes rmPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
.rm-stage{margin:0 12px 10px;border-radius:18px;height:280px;position:relative;
  overflow:hidden;
  background:radial-gradient(60% 50% at 50% 35%,rgba(120,60,220,.5),transparent),
  radial-gradient(40% 40% at 50% 60%,rgba(255,60,180,.3),transparent),
  linear-gradient(180deg,#2a1456,#1a0a3a 50%,#0e0628);
  border:1px solid rgba(170,120,255,.25);}
.rm-stageGlow{position:absolute;inset:0;
  background:radial-gradient(circle at 20% 30%,rgba(0,200,255,.18),transparent 40%),
  radial-gradient(circle at 80% 30%,rgba(255,60,180,.2),transparent 40%),
  radial-gradient(circle at 50% 75%,rgba(255,170,40,.15),transparent 50%);}
.rm-arch{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);
  width:180px;height:160px;border-radius:50% 50% 0 0;
  border:3px solid rgba(255,200,80,.22);
  box-shadow:0 0 40px rgba(255,180,60,.2),inset 0 0 30px rgba(255,180,60,.1);}
.rm-stageLogo{position:absolute;left:50%;top:26%;transform:translateX(-50%);
  text-align:center;z-index:3;}
.rm-cr{font-size:24px;filter:drop-shadow(0 2px 6px rgba(255,180,40,.7));}
.rm-l1{font-weight:800;font-size:24px;line-height:.9;
  background:linear-gradient(180deg,#fff,#e8d0ff);-webkit-background-clip:text;
  background-clip:text;color:transparent;}
.rm-l2{font-weight:800;font-size:24px;
  background:linear-gradient(180deg,#ffe07a,#e0901a);-webkit-background-clip:text;
  background-clip:text;color:transparent;}
.rm-stageFloor{position:absolute;bottom:0;left:0;right:0;height:70px;
  background:linear-gradient(180deg,transparent,rgba(120,60,200,.3));
  border-top:1px solid rgba(170,120,255,.3);}
.rm-booth{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);
  width:110px;height:42px;border-radius:10px;
  background:linear-gradient(180deg,#3a1a6e,#1a0a36);
  border:1px solid rgba(170,120,255,.3);}
.rm-players{position:absolute;left:18px;top:90px;width:140px;z-index:4;
  border-radius:14px;padding:11px;
  background:linear-gradient(180deg,rgba(28,14,56,.92),rgba(16,8,36,.95));
  border:1px solid rgba(170,120,255,.25);backdrop-filter:blur(8px);}
.rm-pHd{text-align:center;margin-bottom:9px;}
.rm-pT{font-size:9px;letter-spacing:.1em;color:#b9a0e0;}
.rm-pC{font-weight:800;font-size:24px;line-height:1;}
.rm-pS{font-size:8px;color:#9a7ac8;}
.rm-pEmpty{font-size:10px;color:#9a7ac8;text-align:center;padding:8px 0;}
.rm-pl{display:flex;align-items:center;gap:6px;margin-bottom:7px;}
.rm-plAv{width:24px;height:24px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,#ff5a8a,#7a3ad0);display:flex;
  align-items:center;justify-content:center;font-size:11px;font-weight:700;}
.rm-plInfo{flex:1;min-width:0;}
.rm-plNm{font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;
  text-overflow:ellipsis;}
.rm-plSt{font-size:8px;color:#9a7ac8;}
.rm-chat{position:absolute;right:18px;top:90px;width:160px;z-index:4;
  height:200px;border-radius:14px;padding:11px;display:flex;flex-direction:column;
  background:linear-gradient(180deg,rgba(28,14,56,.92),rgba(16,8,36,.95));
  border:1px solid rgba(170,120,255,.25);backdrop-filter:blur(8px);}
.rm-chatHd{font-weight:800;font-size:12px;margin-bottom:8px;display:flex;
  align-items:center;gap:5px;}
.rm-chatDot{width:6px;height:6px;border-radius:50%;background:#3ddc6a;
  animation:rmTw 1.5s infinite;}
.rm-chatBody{flex:1;overflow-y:auto;scrollbar-width:none;}
.rm-chatBody::-webkit-scrollbar{display:none;}
.rm-chatEmpty{font-size:10px;color:#9a7ac8;text-align:center;padding:12px 0;}
.rm-msg{display:flex;gap:6px;margin-bottom:8px;}
.rm-msgAv{width:22px;height:22px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,#7a3ad0,#ff5a8a);display:flex;
  align-items:center;justify-content:center;font-size:10px;font-weight:700;}
.rm-msgBd{flex:1;min-width:0;}
.rm-msgNm{font-size:9px;font-weight:700;color:#c9b8e8;}
.rm-msgTx{font-size:10px;color:#e8d8f0;line-height:1.2;word-break:break-word;}
.rm-chatShort{display:flex;flex-wrap:wrap;gap:3px;margin:6px 0;}
.rm-sc{font-size:8px;padding:3px 5px;border-radius:6px;border:none;
  background:rgba(255,255,255,.06);color:#c9b8e8;cursor:pointer;}
.rm-chatin{display:flex;gap:5px;}
.rm-chatInput{flex:1;min-width:0;background:rgba(0,0,0,.3);
  border:1px solid rgba(170,120,255,.2);border-radius:9px;padding:6px 8px;
  color:#fff;font-size:10px;font-family:inherit;}
.rm-chatInput::placeholder{color:#7a6ba8;}
.rm-chatSend{width:28px;border:none;border-radius:9px;cursor:pointer;
  background:linear-gradient(180deg,#9a5ad0,#6a2aa8);color:#fff;font-weight:800;}
.rm-winrow{display:flex;gap:8px;padding:0 12px 10px;}
.rm-prize{flex:1;text-align:center;padding:9px;border-radius:12px;
  border:1px solid rgba(120,90,160,.3);
  background:linear-gradient(180deg,rgba(40,22,75,.6),rgba(22,12,46,.7));}
.rm-prizeWon{background:rgba(60,220,106,.15);border-color:rgba(60,220,106,.4);}
.rm-prizeActive{background:rgba(255,80,160,.12);border-color:rgba(255,80,160,.4);}
.rm-prizeL{font-size:9px;letter-spacing:.08em;color:#b9a0e0;}
.rm-prizeV{font-size:15px;font-weight:800;margin-top:3px;}
.rm-modebanner{margin:0 12px 10px;border-radius:14px;padding:13px;
  display:flex;align-items:center;gap:11px;border:1px solid;}
.rm-mb-emerald{background:rgba(60,220,106,.08);border-color:rgba(60,220,106,.3);}
.rm-mb-cyan{background:rgba(0,200,255,.08);border-color:rgba(0,200,255,.3);}
.rm-mb-gold{background:rgba(255,200,60,.08);border-color:rgba(255,200,60,.3);}
.rm-mb-magenta{background:rgba(255,80,160,.08);border-color:rgba(255,80,160,.3);}
.rm-mbEmoji{font-size:24px;}
.rm-mbTitle{font-weight:800;font-size:15px;}
.rm-mbSub{font-size:11px;color:#b9a0e0;margin-top:2px;}
.rm-buypanel{margin:0 12px 10px;border-radius:14px;padding:14px;
  background:linear-gradient(180deg,rgba(36,20,68,.85),rgba(20,10,40,.9));
  border:1px solid rgba(170,120,255,.25);}
.rm-buyOpen{border-color:rgba(255,80,160,.35);}
.rm-buyClosed{border-color:rgba(255,200,60,.3);background:rgba(255,200,60,.05);}
.rm-buyHd{margin-bottom:10px;}
.rm-buyTtl{font-weight:800;font-size:16px;}
.rm-buySub{font-size:11px;color:#b9a0e0;margin-top:2px;}
.rm-buyWarn{color:#ffd23d;font-weight:600;}
.rm-buyClose{color:#ff5a9a;font-weight:600;}
.rm-buyBtns{display:flex;gap:8px;}
.rm-bg,.rm-bs{flex:1;padding:11px;border:none;border-radius:11px;
  font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;}
.rm-bg{background:rgba(255,255,255,.08);color:#e8d8f0;
  border:1px solid rgba(255,255,255,.12);}
.rm-bs{background:linear-gradient(180deg,#ff4d9a,#c8264f);color:#fff;}
.rm-bg:disabled,.rm-bs:disabled{opacity:.4;cursor:default;}
.rm-strip{margin-top:11px;padding-top:11px;
  border-top:1px solid rgba(170,120,255,.2);}
.rm-stripL{font-size:13px;font-weight:600;margin-bottom:8px;}
.rm-stripBadge{font-size:9px;padding:2px 6px;border-radius:5px;
  background:rgba(255,200,60,.2);color:#ffd23d;}
.rm-stripSub{font-size:10px;color:#9a7ac8;font-weight:400;margin-top:2px;}
.rm-needcoins{display:block;text-align:center;margin-top:10px;font-size:11px;
  color:#5ad0ff;text-decoration:none;}
.rm-section{margin:0 12px 10px;border-radius:14px;padding:13px;
  background:linear-gradient(180deg,rgba(36,20,68,.7),rgba(20,10,40,.8));
  border:1px solid rgba(170,120,255,.22);}
.rm-waiting{border-color:rgba(0,200,255,.3);background:rgba(0,200,255,.05);}
.rm-secHd{display:flex;justify-content:space-between;align-items:flex-start;
  margin-bottom:11px;}
.rm-secKick{font-size:10px;letter-spacing:.1em;color:#5ad0ff;}
.rm-secTtl{font-weight:800;font-size:16px;margin-top:3px;}
.rm-secRight{text-align:right;}
.rm-secK{font-size:9px;letter-spacing:.08em;color:#9a7ac8;}
.rm-secCd{font-weight:800;font-size:20px;}
.rm-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 12px;}
.rm-cardsMain{margin-bottom:10px;}
.rm-more{text-align:center;font-size:12px;color:#9a7ac8;margin-top:8px;}
.rm-card{border-radius:16px;padding:12px;
  background:linear-gradient(180deg,rgba(36,20,68,.85),rgba(20,10,40,.9));
  border:1px solid rgba(170,120,255,.22);}
.rm-cardHd{display:flex;align-items:center;justify-content:space-between;
  margin-bottom:9px;}
.rm-cardN{font-weight:800;font-size:13px;}
.rm-cardRf{color:#9a7ac8;font-size:11px;}
.rm-cardTag{font-size:9px;font-weight:800;text-transform:uppercase;
  padding:3px 8px;border-radius:8px;color:#fff;}
.rm-cardGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;}
.rm-cardNums{margin-top:3px;}
.rm-gh{aspect-ratio:1;display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:13px;border-radius:5px;color:#fff;}
.rm-gh.bb-ball--b{background:linear-gradient(180deg,#9a4ad0,#6a2aa8);}
.rm-gh.bb-ball--i{background:linear-gradient(180deg,#3d7aff,#1f4ad0);}
.rm-gh.bb-ball--n{background:linear-gradient(180deg,#3ddc6a,#1fa84a);}
.rm-gh.bb-ball--g{background:linear-gradient(180deg,#ffb02e,#e0801a);}
.rm-gh.bb-ball--o{background:linear-gradient(180deg,#ff4d7f,#c8264f);}
.rm-gn{aspect-ratio:1;display:flex;align-items:center;justify-content:center;
  font-weight:700;font-size:14px;border-radius:6px;position:relative;
  background:rgba(255,255,255,.04);color:#e8d8f0;
  border:1px solid rgba(255,255,255,.05);}
.rm-gnFree{background:radial-gradient(circle,#9a5ad0,#5a2aa8);color:#fff;
  border-color:rgba(255,255,255,.2);}
.rm-gnMarked{background:radial-gradient(circle,#ff5a8a,#c8264f);color:#fff;
  box-shadow:0 0 8px rgba(255,80,140,.5);}
.rm-gnJust{animation:rmJust .6s ease;}
@keyframes rmJust{0%{transform:scale(1.3)}100%{transform:scale(1)}}
.rm-gnTxt{position:relative;z-index:10;color:#fff;font-weight:800;}
.rm-gnEmpty{background:transparent;border-color:transparent;}
.rm-card90Grid{display:grid;grid-template-columns:repeat(9,1fr);gap:2px;}
.rm-card90 .rm-gn{font-size:11px;border-radius:4px;}
.rm-cardBingo{width:100%;margin-top:10px;padding:10px;border:none;
  border-radius:11px;font-weight:800;font-size:14px;color:#fff;cursor:pointer;
  background:linear-gradient(180deg,#9a5ad0,#6a2aa8);font-family:inherit;
  letter-spacing:.05em;}
.rm-winflash{position:fixed;inset:0;z-index:50;pointer-events:none;
  display:flex;align-items:center;justify-content:center;
  background:rgba(14,4,32,.4);backdrop-filter:blur(4px);}
.rm-wfText{text-align:center;animation:rmWf .5s cubic-bezier(.2,1.5,.4,1);}
@keyframes rmWf{from{transform:scale(.5);opacity:0}to{transform:scale(1);opacity:1}}
.rm-wfBig{font-weight:800;font-size:clamp(4rem,15vw,10rem);line-height:1;
  background:linear-gradient(180deg,#fff,#ffd23d 55%,#e0901a);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 4px 20px rgba(255,180,50,.8));}
.rm-wfSub{font-size:18px;color:#fff;margin-top:12px;font-weight:600;}
.rm-toast{position:fixed;top:76px;left:50%;transform:translateX(-50%);
  z-index:40;padding:12px 20px;border-radius:12px;font-size:13px;
  font-weight:600;backdrop-filter:blur(10px);
  animation:rmSlide .3s ease;max-width:90%;}
@keyframes rmSlide{from{transform:translate(-50%,-10px);opacity:0}
  to{transform:translate(-50%,0);opacity:1}}
.rm-toastOk{background:rgba(60,220,106,.15);color:#5ddc8a;
  border:1px solid rgba(60,220,106,.4);}
.rm-toastErr{background:rgba(255,80,160,.15);color:#ff8ac0;
  border:1px solid rgba(255,80,160,.4);}
.rm-actionbar{position:fixed;bottom:0;left:50%;transform:translateX(-50%);
  width:100%;max-width:560px;z-index:20;padding:12px;display:flex;
  align-items:center;gap:10px;
  background:linear-gradient(180deg,transparent,rgba(10,4,24,.96) 30%);}
.rm-abtn{border-radius:14px;padding:11px 14px;display:flex;flex-direction:column;
  align-items:center;gap:3px;font-size:10px;font-weight:700;text-decoration:none;
  background:linear-gradient(180deg,rgba(40,22,75,.9),rgba(22,12,46,.95));
  border:1px solid rgba(170,120,255,.25);color:#c9b8e8;cursor:pointer;
  flex-shrink:0;}
.rm-abI{font-size:18px;}
.rm-buybig{flex:1;border-radius:16px;padding:15px;border:none;cursor:pointer;
  font-weight:800;font-size:15px;color:#fff;display:flex;align-items:center;
  justify-content:center;gap:8px;font-family:inherit;position:relative;
  overflow:hidden;
  background:linear-gradient(135deg,#ff4d9a,#c8264f);
  box-shadow:0 0 26px rgba(255,80,160,.6),0 6px 16px rgba(0,0,0,.5);}
.rm-buybig:disabled{opacity:.6;}
.rm-bbSub{font-size:9px;font-weight:600;opacity:.85;}
.rm-bbSh{position:absolute;inset:0;background:linear-gradient(110deg,
  transparent 40%,rgba(255,255,255,.4) 50%,transparent 60%);
  animation:rmSh 2.5s linear infinite;}
@keyframes rmSh{to{transform:translateX(100%)}}
@media(min-width:900px){
  .rm-root{max-width:1100px;padding-bottom:40px;}
  .rm-stage{height:360px;}
  .rm-players,.rm-chat{width:200px;}
  .rm-chat{height:280px;}
  .rm-cards{grid-template-columns:repeat(4,1fr);}
  .rm-actionbar{max-width:1100px;}
  .rm-l1,.rm-l2{font-size:34px;}
  .rm-n{font-size:24px;}
}
`;
