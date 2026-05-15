"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  COLS_75, ballClass, ballLetter, ball90Class, checkCardStatus,
  type Card as CardType, type Variant,
} from "@/lib/game/engine";
import { isMuted, setMuted, playBallCalled, playOneToGo, playWin, playPurchase, playGameStart } from "@/lib/sounds";
import type { Profile, RoomLive } from "@/lib/supabase/types";
import { NumberMarker, Confetti } from "@/components/Marker";
import Link from "next/link";

type Ball = { ball_number: number; sequence: number };
type MyCard = { id: string; game_id: string; card_data: CardType; currency: "gold" | "sweeps" };
type ChatMsg = { id: string; player_id: string | null; is_mc: boolean; message: string; created_at: string; username?: string };

type RoomState = {
  room: any;
  playing_game: {
    id: string;
    pot_gold: number;
    pot_sweeps: number;
    balls_count: number;
    line_won_by: string | null;
    two_lines_won_by: string | null;
    full_house_won_by: string | null;
  } | null;
  waiting_game: {
    id: string;
    pot_gold: number;
    pot_sweeps: number;
    starts_at: string;
  } | null;
  my_cards_playing: number;
  my_cards_waiting: number;
  purchase_open: boolean;
  purchase_closes_in_s: number;
};

const CHAT_SHORTCUTS = ["GL all 🍀", "1TG 🎯", "2TG 👀", "WTG 🎉", "TY 💚", "GG 🤝"];

export default function RoomClient({
  initialRoom,
  initialProfile,
  userId,
}: {
  initialRoom: RoomLive & { variant: Variant };
  initialProfile: Profile;
  userId: string;
}) {
  const supabase = createClient();
  const [room] = useState(initialRoom);
  const isB90 = room.variant === "bingo90";
  const [profile, setProfile] = useState(initialProfile);
  const [state, setState] = useState<RoomState | null>(null);
  const [myCardsPlaying, setMyCardsPlaying] = useState<MyCard[]>([]);
  const [myCardsWaiting, setMyCardsWaiting] = useState<MyCard[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [buying, setBuying] = useState(false);
  const [buyingStrip, setBuyingStrip] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [winFlash, setWinFlash] = useState<{ pattern: string; amount: number } | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [muted, setMutedState] = useState(isMuted());
  const [countdownPlay, setCountdownPlay] = useState<number | null>(null);
  const [countdownClose, setCountdownClose] = useState<number | null>(null);
  const [justMarked, setJustMarked] = useState<Set<string>>(new Set());
  const chatRef = useRef<HTMLDivElement>(null);
  const prevBallsLen = useRef(0);
  const prev1TG = useRef<Set<string>>(new Set());
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const playingGameId = state?.playing_game?.id ?? null;
  const waitingGameId = state?.waiting_game?.id ?? null;

  const calledSet = useMemo(() => new Set(balls.map((b) => b.ball_number)), [balls]);
  const lastBall = balls.length ? balls[balls.length - 1] : null;

  const cardStatuses = useMemo(() => {
    const m: Record<string, ReturnType<typeof checkCardStatus>> = {};
    for (const c of myCardsPlaying) m[c.id] = checkCardStatus(c.card_data, calledSet);
    return m;
  }, [myCardsPlaying, calledSet]);

  // ============ LOAD ROOM STATE ============
  async function loadRoomState() {
    const { data, error } = await supabase.rpc("get_room_state", { p_room_id: room.id });
    if (error || !data) return;
    setState(data as RoomState);
    const s = data as RoomState;

    // Load cards in playing game
    if (s.playing_game) {
      const { data: cards } = await supabase
        .from("cards").select("*").eq("game_id", s.playing_game.id).eq("player_id", userId);
      setMyCardsPlaying((cards as any) ?? []);

      const { data: bs } = await supabase
        .from("balls_called").select("*").eq("game_id", s.playing_game.id).order("sequence");
      setBalls((bs as Ball[]) ?? []);
    } else {
      setMyCardsPlaying([]);
      setBalls([]);
    }

    // Load cards in waiting game
    if (s.waiting_game) {
      const { data: cards } = await supabase
        .from("cards").select("*").eq("game_id", s.waiting_game.id).eq("player_id", userId);
      setMyCardsWaiting((cards as any) ?? []);
    } else {
      setMyCardsWaiting([]);
    }
  }

  useEffect(() => {
    loadRoomState();
    const interval = setInterval(loadRoomState, 8000);  // periodic refresh as fallback
    return () => clearInterval(interval);
  }, [room.id]);

  // ============ REALTIME ============
  useEffect(() => {
    const channel = supabase
      .channel(`room:${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `room_id=eq.${room.id}` },
        () => loadRoomState()
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "balls_called" },
        (p) => {
          const b = p.new as Ball & { game_id: string };
          if (b.game_id === playingGameId) {
            setBalls((prev) => prev.some((x) => x.sequence === b.sequence) ? prev : [...prev, b]);
          }
        }
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" },
        async (p) => {
          const m = p.new as any;
          if (m.game_id !== playingGameId && m.game_id !== waitingGameId) return;
          if (m.is_mc) {
            setChat((prev) => [...prev, { ...m, username: m.message.split(":")[0] }]);
          } else {
            const { data } = await supabase.from("profiles").select("username").eq("id", m.player_id).single();
            setChat((prev) => [...prev, { ...m, username: (data as any)?.username ?? "?" }]);
          }
        }
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
            supabase.from("profiles").select("*").eq("id", userId).single<Profile>().then(({ data }) => {
              if (data) setProfile(data);
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room.id, playingGameId, waitingGameId]);

  // ============ Load chat for current playing/waiting game ============
  useEffect(() => {
    const gameId = playingGameId ?? waitingGameId;
    if (!gameId) { setChat([]); return; }
    supabase.from("chat_messages")
      .select("*, profiles(username)")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true })
      .limit(80)
      .then(({ data }) => {
        if (data) setChat((data as any[]).map((m) => ({ ...m, username: m.profiles?.username ?? "MC" })));
      });
  }, [playingGameId, waitingGameId]);

  // ============ TICK (client-driven ball drops) ============
  useEffect(() => {
    if (!playingGameId && !waitingGameId) return;

    const tick = async () => {
      const targetId = playingGameId ?? waitingGameId;
      if (!targetId) return;
      try {
        await fetch("/api/game/tick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_id: targetId }),
        });
      } catch {}
    };

    tickIntervalRef.current = setInterval(tick, 3000);
    tick();
    return () => { if (tickIntervalRef.current) clearInterval(tickIntervalRef.current); };
  }, [playingGameId, waitingGameId]);

  // Ball sound + 1TG detection
  useEffect(() => {
    if (balls.length > prevBallsLen.current) {
      const newBall = balls[balls.length - 1];
      if (newBall) {
        playBallCalled(newBall.ball_number);
        const newMarks = new Set<string>();
        for (const c of myCardsPlaying) {
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
    for (const c of myCardsPlaying) {
      const s = cardStatuses[c.id];
      if (s && s.to_line === 1) new1TG.add(c.id);
    }
    for (const id of new1TG) {
      if (!prev1TG.current.has(id)) { playOneToGo(); break; }
    }
    prev1TG.current = new1TG;
  }, [balls, myCardsPlaying, cardStatuses]);

  // Countdown to play start
  useEffect(() => {
    if (!state?.waiting_game) { setCountdownPlay(null); setCountdownClose(null); return; }
    const target = new Date(state.waiting_game.starts_at).getTime();
    const tick = () => {
      const ms = target - Date.now();
      setCountdownPlay(Math.max(0, Math.floor(ms / 1000)));
      setCountdownClose(Math.max(0, Math.floor((ms - 5000) / 1000)));  // 5s before play
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [state?.waiting_game]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

  // ============ MODE DETECTION ============
  const playing = !!state?.playing_game;
  const waiting = !!state?.waiting_game;
  const hasPlayingCards = (state?.my_cards_playing ?? 0) > 0;
  const hasWaitingCards = (state?.my_cards_waiting ?? 0) > 0;
  const purchaseOpen = state?.purchase_open && !!waiting;

  let mode: "live" | "spectator-queue" | "spectator-locked" | "buy" | "wait-with-cards" = "buy";
  if (playing && hasPlayingCards) mode = "live";
  else if (playing && waiting && purchaseOpen) mode = "spectator-queue";
  else if (playing && (!waiting || !purchaseOpen)) mode = "spectator-locked";
  else if (!playing && hasWaitingCards) mode = "wait-with-cards";
  else mode = "buy";

  // ============ ACTIONS ============
  async function buyTicket(currency: "gold" | "sweeps") {
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
      const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single<Profile>();
      if (p) setProfile(p);
      await loadRoomState();
      setToast({ ok: true, text: "✅ Cartón comprado para la siguiente ronda" });
      setTimeout(() => setToast(null), 3000);
    }
  }

  async function buyStrip(currency: "gold" | "sweeps") {
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
      const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).single<Profile>();
      if (p) setProfile(p);
      await loadRoomState();
      setToast({ ok: true, text: "🎫 Tira de 6 cartones comprada · -15%" });
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

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-[var(--color-bg)] grain">
      {confettiTrigger > 0 && <Confetti trigger={confettiTrigger} />}

      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur-xl border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-2">
          <Link href="/lobby" className="text-sm text-[var(--color-fg-dim)] hover:text-white flex items-center gap-1.5">
            ← <span className="hidden sm:inline">Lobby</span>
          </Link>
          <div className="font-display text-lg md:text-xl truncate text-center flex-1">{room.name}</div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="w-8 h-8 rounded-full glass flex items-center justify-center text-sm hover:bg-white/10 transition-colors">
              {muted ? "🔇" : "🔊"}
            </button>
            <div className="glass rounded-full px-3 py-1.5 font-mono text-xs whitespace-nowrap">🪙 {profile.gold_coins.toLocaleString()}</div>
            <div className="rounded-full px-3 py-1.5 bg-[var(--color-magenta)]/15 border border-[var(--color-magenta)]/30 font-mono text-xs whitespace-nowrap">
              💎 {profile.sweeps_coins.toFixed(2)}
            </div>
          </div>
        </div>
      </header>

      {winFlash && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center bg-[var(--color-bg)]/40 backdrop-blur-sm">
          <div className="text-center bb-win-text">
            <div className="font-display text-[clamp(5rem,16vw,12rem)] shimmer-gold leading-none drop-shadow-2xl">¡BINGO!</div>
            <div className="font-mono text-xl text-white mt-4">
              {winFlash.pattern.replace("_", " ").toUpperCase()} · ${winFlash.amount.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 anim-slide-up px-4">
          <div className={`card glass px-5 py-3 font-medium text-sm ${toast.ok ? "border-[var(--color-emerald)]/50 text-[var(--color-emerald)]" : "border-[var(--color-magenta)]/50 text-[var(--color-magenta)]"}`}>
            {toast.text}
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 grid lg:grid-cols-[1fr_320px] gap-4 md:gap-6">
        <div className="space-y-4">
          {/* ============ MODE BANNER ============ */}
          <ModeBanner mode={mode} countdownPlay={countdownPlay} countdownClose={countdownClose} hasWaitingCards={hasWaitingCards} myCardsWaiting={state?.my_cards_waiting ?? 0} />

          {/* ============ GAME STATE — only if playing or waiting exists ============ */}
          {(playing || waiting) && (
            <div className="card p-5 md:p-7 bb-prize-ribbon">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {playing ? (
                      <span className="font-mono text-xs px-3 py-1 rounded-full bg-[var(--color-emerald)]/15 text-[var(--color-emerald)] border border-[var(--color-emerald)]/30 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)] anim-blink" />
                        EN JUEGO
                      </span>
                    ) : (
                      <span className="font-mono text-xs px-3 py-1 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/30">
                        EMPIEZA EN {formatCountdown(countdownPlay)}
                      </span>
                    )}
                    {playing && (
                      <span className="text-xs font-mono text-[var(--color-fg-muted)]">{balls.length}/{isB90 ? 90 : 75}</span>
                    )}
                  </div>

                  {/* Prize indicators */}
                  {playing && state?.playing_game && (
                    <div className="grid grid-cols-3 gap-2">
                      <PrizeIndicator label="Línea" won={!!state.playing_game.line_won_by} active={!state.playing_game.line_won_by} />
                      {isB90 && <PrizeIndicator label="Doble" won={!!state.playing_game.two_lines_won_by} active={!!state.playing_game.line_won_by && !state.playing_game.two_lines_won_by} />}
                      {!isB90 && <div />}
                      <PrizeIndicator label="Bingo" won={!!state.playing_game.full_house_won_by} active={(isB90 ? !!state.playing_game.two_lines_won_by : !!state.playing_game.line_won_by) && !state.playing_game.full_house_won_by} />
                    </div>
                  )}
                </div>

                {/* MEGA BALL */}
                {lastBall ? (
                  <div key={lastBall.sequence} className="relative flex-shrink-0">
                    <div className="bb-pulse-ring" style={{ "--ball-color": getBallColor(lastBall.ball_number, isB90) } as any} />
                    <div className={`bb-ball-3d bb-ball-drop ${isB90 ? ball90Class(lastBall.ball_number) : ballClass(lastBall.ball_number)} w-28 h-28 md:w-36 md:h-36`}>
                      {!isB90 && <span className="font-mono text-xs opacity-70 -mb-1">{ballLetter(lastBall.ball_number)}</span>}
                      <span className="font-display text-5xl md:text-6xl leading-none">{lastBall.ball_number}</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-fg-muted)] font-mono text-xs flex-shrink-0">
                    ESPERA
                  </div>
                )}
              </div>

              {/* Recent balls */}
              {playing && (
                <div className="mt-5 md:mt-6 pt-5 border-t border-[var(--color-border)]">
                  <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-fg-muted)] mb-2.5">Últimas 12 bolas</div>
                  <div className="flex flex-wrap gap-1.5 min-h-[40px]">
                    {balls.slice(-12).reverse().map((b) => (
                      <div key={b.sequence} className={`bb-ball-3d ${isB90 ? ball90Class(b.ball_number) : ballClass(b.ball_number)} w-10 h-10 md:w-11 md:h-11`}>
                        <span className="font-display text-sm md:text-base">{b.ball_number}</span>
                      </div>
                    ))}
                    {balls.length === 0 && (
                      <div className="text-sm text-[var(--color-fg-muted)] italic-serif">Esperando primera bola...</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============ BUY SECTION ============ */}
          {(mode === "buy" || mode === "spectator-queue" || mode === "wait-with-cards") && state?.waiting_game && (
            <div className={`card p-4 md:p-5 ${purchaseOpen ? "border-[var(--color-magenta)]/30" : "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5"}`}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-display text-lg md:text-xl">
                    {hasWaitingCards ? "Comprar más cartones" : "Comprar cartón para la siguiente ronda"}
                  </div>
                  <div className="text-xs md:text-sm text-[var(--color-fg-dim)]">
                    {hasWaitingCards && `${state.my_cards_waiting} en cola`}
                    {!purchaseOpen && (
                      <span className="text-[var(--color-gold)] font-medium">
                        {hasWaitingCards ? " · " : ""}⏰ Ventana cerrada — próxima ronda empieza en {formatCountdown(countdownPlay)}
                      </span>
                    )}
                    {purchaseOpen && (countdownClose ?? 99) < 10 && (
                      <span className="text-[var(--color-magenta)] font-medium"> · Cierra en {countdownClose}s</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => buyTicket("gold")} disabled={buying || !purchaseOpen || profile.gold_coins < room.ticket_gold} className="btn btn-ghost disabled:opacity-40 text-sm">
                    🪙 {room.ticket_gold}
                  </button>
                  <button onClick={() => buyTicket("sweeps")} disabled={buying || !purchaseOpen || profile.sweeps_coins < room.ticket_sweeps} className="btn btn-primary disabled:opacity-40 text-sm">
                    💎 ${room.ticket_sweeps}
                  </button>
                </div>
              </div>
              {isB90 && purchaseOpen && (state.my_cards_waiting + 6) <= (room.max_cards_per_player ?? 6) && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      🎫 Tira de 6 cartones <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-gold)]/20 text-[var(--color-gold)]">-15%</span>
                    </div>
                    <div className="text-xs text-[var(--color-fg-muted)]">Cobertura completa de los 90 números</div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => buyStrip("gold")} disabled={buyingStrip} className="btn btn-ghost text-sm">🪙 {Math.round(room.ticket_gold * 6 * 0.85)}</button>
                    <button onClick={() => buyStrip("sweeps")} disabled={buyingStrip} className="btn btn-primary text-sm">💎 ${(room.ticket_sweeps * 6 * 0.85).toFixed(2)}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============ MY CARDS IN WAITING ============ */}
          {myCardsWaiting.length > 0 && (
            <div className="card p-4 md:p-5 border-[var(--color-cyan)]/30 bg-[var(--color-cyan)]/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs font-mono uppercase tracking-wider text-[var(--color-cyan)] mb-1">
                    ⏱️ En cola para la siguiente ronda
                  </div>
                  <div className="font-display text-lg">
                    {myCardsWaiting.length} {myCardsWaiting.length === 1 ? "cartón" : "cartones"} listos
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-fg-muted)]">Empieza en</div>
                  <div className="font-mono text-2xl">{formatCountdown(countdownPlay)}</div>
                </div>
              </div>
              <div className={`grid ${myCardsWaiting.length === 1 ? "" : isB90 ? "" : "md:grid-cols-2"} gap-3 opacity-70`}>
                {myCardsWaiting.slice(0, 4).map((card, idx) => (
                  isB90 ? (
                    <Card90 key={card.id} card={card} status={undefined} calledSet={new Set()} index={idx} justMarked={new Set()} />
                  ) : (
                    <Card75 key={card.id} card={card} status={undefined} calledSet={new Set()} index={idx} justMarked={new Set()} />
                  )
                ))}
              </div>
              {myCardsWaiting.length > 4 && (
                <div className="text-center mt-3 text-sm text-[var(--color-fg-dim)]">+{myCardsWaiting.length - 4} más</div>
              )}
            </div>
          )}

          {/* ============ MY CARDS PLAYING (live) ============ */}
          {myCardsPlaying.length > 0 && (
            <div className={`grid ${myCardsPlaying.length === 1 ? "" : isB90 ? "" : "md:grid-cols-2"} gap-3 md:gap-4`}>
              {myCardsPlaying.map((card, idx) => (
                isB90 ? (
                  <Card90 key={card.id} card={card} status={cardStatuses[card.id]} calledSet={calledSet} index={idx} justMarked={justMarked} />
                ) : (
                  <Card75 key={card.id} card={card} status={cardStatuses[card.id]} calledSet={calledSet} index={idx} justMarked={justMarked} />
                )
              ))}
            </div>
          )}

          {/* Mobile chat */}
          <aside className="card overflow-hidden flex flex-col h-[400px] lg:hidden">
            <ChatPanel chat={chat} chatRef={chatRef} chatInput={chatInput} setChatInput={setChatInput} onSend={sendChat} />
          </aside>
        </div>

        <aside className="card overflow-hidden flex-col h-[640px] lg:sticky lg:top-20 hidden lg:flex">
          <ChatPanel chat={chat} chatRef={chatRef} chatInput={chatInput} setChatInput={setChatInput} onSend={sendChat} />
        </aside>
      </main>
    </div>
  );
}

// ============ MODE BANNER ============
function ModeBanner({ mode, countdownPlay, countdownClose, hasWaitingCards, myCardsWaiting }: {
  mode: string;
  countdownPlay: number | null;
  countdownClose: number | null;
  hasWaitingCards: boolean;
  myCardsWaiting: number;
}) {
  const content = (() => {
    switch (mode) {
      case "live":
        return { emoji: "🎯", title: "¡Tu partida está en curso!", subtitle: "Las bolas marcadas son las que salen", color: "emerald" };
      case "spectator-queue":
        return {
          emoji: "👀",
          title: "Mirando la partida actual",
          subtitle: `Compra ahora para la siguiente · Ventana cierra ${countdownClose != null ? `en ${countdownClose}s` : "pronto"}`,
          color: "cyan",
        };
      case "spectator-locked":
        return {
          emoji: "⏰",
          title: "Ventana de compra cerrada",
          subtitle: `Próxima ronda empieza en ${formatCountdown(countdownPlay)} · Espera para comprar`,
          color: "gold",
        };
      case "wait-with-cards":
        return { emoji: "⏱️", title: `${myCardsWaiting} cartones listos`, subtitle: `La ronda empieza en ${formatCountdown(countdownPlay)}`, color: "cyan" };
      case "buy":
      default:
        return { emoji: "🎫", title: "Compra tu cartón", subtitle: `La ronda empieza en ${formatCountdown(countdownPlay)}`, color: "magenta" };
    }
  })();

  const colorMap: Record<string, string> = {
    emerald: "border-[var(--color-emerald)]/30 bg-[var(--color-emerald)]/5",
    cyan: "border-[var(--color-cyan)]/30 bg-[var(--color-cyan)]/5",
    gold: "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5",
    magenta: "border-[var(--color-magenta)]/30 bg-[var(--color-magenta)]/5",
  };

  return (
    <div className={`card p-4 ${colorMap[content.color]} flex items-center gap-3 anim-slide-up`}>
      <div className="text-2xl">{content.emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="font-display text-base md:text-lg">{content.title}</div>
        <div className="text-xs text-[var(--color-fg-dim)]">{content.subtitle}</div>
      </div>
    </div>
  );
}

// ============ PRIZE INDICATOR ============
function PrizeIndicator({ label, won, active }: { label: string; won: boolean; active: boolean }) {
  return (
    <div className={`text-center p-2 rounded-lg border transition-all ${
      won ? "bg-[var(--color-emerald)]/15 border-[var(--color-emerald)]/40" :
      active ? "bg-[var(--color-magenta)]/10 border-[var(--color-magenta)]/40" :
      "border-[var(--color-border)]"
    }`}>
      <div className={`text-[10px] font-mono uppercase tracking-wider ${won ? "text-[var(--color-emerald)]" : active ? "text-[var(--color-magenta)]" : "text-[var(--color-fg-muted)]"}`}>
        {label}
      </div>
      <div className="text-base mt-0.5">{won ? "✓" : active ? "..." : "—"}</div>
    </div>
  );
}

// ============ CARDS (same as v12) ============
function Card75({ card, status, calledSet, index, justMarked }: any) {
  const toLine = status?.to_line ?? 99;
  const won = status?.full_house;
  const tag = (() => {
    if (won) return { text: "¡BINGO!", color: "from-[#FFD93D] to-[#FF3D7F]" };
    if (status?.line) return { text: "Línea ✓", color: "from-[#00E676] to-[#00E5FF]" };
    if (toLine === 1) return { text: "1TG", color: "from-[#FF3D7F] to-[#FFD93D]", anim: true };
    if (toLine === 2) return { text: "2TG", color: "from-[#B388FF] to-[#FF3D7F]" };
    return null;
  })();
  const headerCls: Record<string, string> = { B: "bb-ball--b", I: "bb-ball--i", N: "bb-ball--n", G: "bb-ball--g", O: "bb-ball--o" };

  return (
    <div className={`card p-4 relative bb-card-in ${won ? "bb-winning-card border-[var(--color-gold)]/50" : ""}`} style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-display text-lg">Cartón #{index + 1}</div>
        {tag && (
          <div className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gradient-to-r ${tag.color} text-white ${tag.anim ? "bb-1tg" : ""}`}>{tag.text}</div>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1.5 mb-2">
        {COLS_75.map((l) => (
          <div key={l} className={`bb-ball-3d ${headerCls[l]} aspect-square text-xl md:text-2xl`}>
            <span className="font-display">{l}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {card.card_data.flatMap((row: any[], r: number) =>
          row.map((val: any, c: number) => {
            const isMarked = val === "FREE" || (typeof val === "number" && calledSet.has(val));
            const key = `${card.id}-${r}-${c}`;
            const isJust = justMarked.has(key);
            const colorByCol = ["#FF3D7F", "#FFD93D", "#00E5FF", "#B388FF", "#00E676"][c];
            return (
              <div key={key} className={`bb-cell ${isMarked ? "bb-cell--marked" : ""} ${isJust ? "bb-cell--just-marked" : ""}`}>
                <span className={isMarked && val !== "FREE" ? "relative z-10 text-white font-bold" : ""}>
                  {val === "FREE" ? <span className="text-[9px] font-mono uppercase">FREE</span> : val}
                </span>
                <NumberMarker color={colorByCol} visible={!!isMarked && val !== "FREE"} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Card90({ card, status, calledSet, index, justMarked }: any) {
  const toLine = status?.to_line ?? 99;
  const won = status?.full_house;
  const tag = (() => {
    if (won) return { text: "¡BINGO!", color: "from-[#FFD93D] to-[#FF3D7F]" };
    if (status?.two_lines) return { text: "Doble ✓", color: "from-[#00E5FF] to-[#B388FF]" };
    if (status?.line) return { text: "Línea ✓", color: "from-[#00E676] to-[#00E5FF]" };
    if (toLine === 1) return { text: "1TG", color: "from-[#FF3D7F] to-[#FFD93D]", anim: true };
    if (toLine === 2) return { text: "2TG", color: "from-[#B388FF] to-[#FF3D7F]" };
    return null;
  })();
  return (
    <div className={`card p-3 md:p-4 relative bb-card-in ${won ? "bb-winning-card border-[var(--color-gold)]/50" : ""}`} style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="font-display text-base md:text-lg">Cartón #{index + 1}</div>
        {tag && <div className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r ${tag.color} text-white ${tag.anim ? "bb-1tg" : ""}`}>{tag.text}</div>}
      </div>
      <div className="bb-card-90">
        {card.card_data.flatMap((row: any[], r: number) =>
          row.map((val: any, c: number) => {
            const isEmpty = val == null;
            const isMarked = !isEmpty && typeof val === "number" && calledSet.has(val);
            const key = `${card.id}-${r}-${c}`;
            const isJust = justMarked.has(key);
            const colorByCol = ["#FF3D7F", "#FFD93D", "#00E5FF", "#B388FF", "#00E676", "#FF3D7F", "#FFD93D", "#00E5FF", "#B388FF"][c];
            return (
              <div key={key} className={`bb-cell ${isEmpty ? "bb-cell--empty" : ""} ${isMarked ? "bb-cell--marked" : ""} ${isJust ? "bb-cell--just-marked" : ""}`}>
                {!isEmpty && (
                  <>
                    <span className={isMarked ? "relative z-10 text-white font-bold" : ""}>{val}</span>
                    <NumberMarker color={colorByCol} visible={isMarked} />
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ChatPanel({ chat, chatRef, chatInput, setChatInput, onSend }: any) {
  return (
    <>
      <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="font-medium text-sm flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)] anim-blink" />Chat
        </div>
        <div className="font-mono text-xs text-[var(--color-fg-muted)]">{chat.length}</div>
      </div>
      <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {chat.length === 0 ? (
          <div className="text-center text-[var(--color-fg-muted)] text-sm py-8 italic-serif">Sé el primero en saludar 👋</div>
        ) : (
          chat.map((m: ChatMsg) => (
            <div key={m.id} className="flex items-start gap-2 text-sm">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${m.is_mc ? "bg-[var(--color-magenta)]" : "bg-gradient-to-br from-[#00E5FF] to-[#B388FF]"} text-white`}>
                {m.is_mc ? "M" : (m.username?.[0]?.toUpperCase() ?? "?")}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-[11px] font-medium mb-0.5 ${m.is_mc ? "text-[var(--color-magenta)]" : "text-[var(--color-cyan)]"}`}>
                  {m.is_mc ? "🎤 " + (m.username?.replace(/^[^A-Za-z]+/, "") ?? "MC") : m.username}
                </div>
                <div className="text-[var(--color-fg-dim)] break-words leading-snug">{m.message}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="px-3 py-2 border-t border-[var(--color-border)] flex flex-wrap gap-1.5">
        {CHAT_SHORTCUTS.map((s) => (
          <button key={s} onClick={() => onSend(s)} className="text-[11px] font-mono px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[var(--color-fg-dim)] hover:text-white transition-colors">{s}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSend(); }} className="p-3 border-t border-[var(--color-border)] flex gap-2">
        <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Escribe..." maxLength={200} className="input text-sm py-2" />
        <button type="submit" className="btn btn-primary px-3 text-sm">→</button>
      </form>
    </>
  );
}

function formatCountdown(s: number | null) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function getBallColor(n: number, is90: boolean): string {
  if (is90) {
    if (n <= 9) return "#FF3D7F"; if (n <= 19) return "#FFD93D"; if (n <= 29) return "#00E5FF";
    if (n <= 39) return "#B388FF"; if (n <= 49) return "#00E676"; if (n <= 59) return "#FF3D7F";
    if (n <= 69) return "#FFD93D"; if (n <= 79) return "#00E5FF"; return "#B388FF";
  }
  return n <= 15 ? "#FF3D7F" : n <= 30 ? "#FFD93D" : n <= 45 ? "#00E5FF" : n <= 60 ? "#B388FF" : "#00E676";
}

function errorLabel(msg: string): string {
  const map: Record<string, string> = {
    purchase_window_closed: "⏰ Ventana cerrada. Espera la próxima ronda.",
    insufficient_funds: "Te faltan monedas. Visita la tienda.",
    kyc_required: "Completa la verificación primero.",
    state_excluded: "Tu estado no permite usar Sweeps Coins.",
    max_cards_reached: "Máximo de cartones alcanzado.",
    game_not_active: "La partida ya no está activa.",
    account_banned: "Cuenta suspendida.",
    self_excluded: "Estás auto-excluido.",
    strips_only_for_bingo90: "Las tiras solo están en Bingo 90.",
  };
  for (const k of Object.keys(map)) if (msg.includes(k)) return map[k];
  return msg;
}
