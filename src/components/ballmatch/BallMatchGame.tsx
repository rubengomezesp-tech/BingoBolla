"use client";

// ============================================================================
// BingoBolla · Ball Match — Juego nativo (UI + animación)
// ----------------------------------------------------------------------------
// Reproduce los "pasos" del motor con animación: swap -> pop -> caída -> cascada.
// Twist de marca: las bolas eliminadas marcan un cartón BINGO; completar líneas
// es el objetivo del nivel. Especiales, hielo, fever y un booster (martillo).
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cloneBoard,
  createBoard,
  hasPossibleMove,
  makeIdGen,
  makeRng,
  resolve,
  shuffle,
  trySwap,
  type Rng,
} from "./engine";
import { getLevel, seedFor } from "./levels";
import { CARD_N, countLines, createCard, FREE, isFullCard, markBalls, type Card } from "./bingo";
import { LETTERS, type Board, type Coord } from "./types";
import { sounds, initAudio, isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import "./ballmatch.css";

/** Vibración háptica suave (si el dispositivo la soporta). */
function haptic(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* no-op */
    }
  }
}

export interface GameResult {
  win: boolean;
  stars: number;
  xp: number;
  level: number;
  score: number;
}

interface Props {
  level: number;
  onExit: () => void;
  onComplete: (r: GameResult) => void;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const ckey = (r: number, c: number) => `${r},${c}`;
const HEADER_COLOR = ["#ff3d7f", "#ffd93d", "#00e5ff", "#b388ff", "#00e676"];

/** Cuenta las celdas con hielo restantes en el tablero. */
function countIce(b: Board): number {
  let n = 0;
  for (const row of b) for (const cell of row) if (cell && cell.ice > 0) n++;
  return n;
}

/** Conjunto de celdas del cartón que pertenecen a alguna línea completa. */
function lineCellSet(card: Card): Set<string> {
  const set = new Set<string>();
  for (let r = 0; r < CARD_N; r++) if (card[r].every(Boolean)) for (let c = 0; c < CARD_N; c++) set.add(ckey(r, c));
  for (let c = 0; c < CARD_N; c++) if (card.every((row) => row[c])) for (let r = 0; r < CARD_N; r++) set.add(ckey(r, c));
  if (card.every((row, i) => row[i])) for (let i = 0; i < CARD_N; i++) set.add(ckey(i, i));
  if (card.every((row, i) => row[CARD_N - 1 - i])) for (let i = 0; i < CARD_N; i++) set.add(ckey(i, CARD_N - 1 - i));
  return set;
}

export default function BallMatchGame({ level, onExit, onComplete }: Props) {
  const cfg = useMemo(() => getLevel(level), [level]);

  // refs persistentes del motor
  const rngRef = useRef<Rng>(makeRng(seedFor(level)));
  const idRef = useRef<() => number>(makeIdGen(1));
  const boardRef = useRef<Board>([]);
  const cardRef = useRef<Card>(createCard());
  const busyRef = useRef(false);
  const feverMeterRef = useRef(0);
  const feverActiveRef = useRef(false);
  const movesRef = useRef(cfg.moves);
  const scoreRef = useRef(0);
  const collectedRef = useRef(0);

  // estado de render
  const [board, setBoard] = useState<Board>(() => {
    const b = createBoard(cfg, rngRef.current, idRef.current);
    boardRef.current = b;
    return b;
  });
  const [card, setCard] = useState<Card>(() => cardRef.current);
  const [moves, setMoves] = useState(cfg.moves);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [selected, setSelected] = useState<Coord | null>(null);
  const [popping, setPopping] = useState<Set<number>>(new Set());
  const [spawning, setSpawning] = useState<Set<number>>(new Set());
  const [feverMeter, setFeverMeter] = useState(0);
  const [feverOn, setFeverOn] = useState(false);
  const [feverFlash, setFeverFlash] = useState(false);
  const [fx, setFx] = useState<{ key: number; r: number; c: number }[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [hammer, setHammer] = useState(3);
  const [hammerArmed, setHammerArmed] = useState(false);
  const [shuffles, setShuffles] = useState(2);
  const [extraMoves, setExtraMoves] = useState(1);
  const [collected, setCollected] = useState(0);
  const [muted, setMuted] = useState(false);
  const fxKey = useRef(0);

  // sincroniza el estado de mute con la preferencia persistida (tras hidratar)
  useEffect(() => {
    setMuted(!isSoundEnabled());
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      setSoundEnabled(m); // si estaba muteado -> activa
      if (m) {
        initAudio();
        sounds.click();
      }
      return !m;
    });
  }, []);

  const n = cfg.size;
  const lineCells = useMemo(() => lineCellSet(card), [card]);
  const iceLeft = useMemo(() => countIce(board), [board]);

  const syncCard = useCallback(() => {
    setCard(cardRef.current.map((row) => [...row]));
    setLines(countLines(cardRef.current));
  }, []);

  const spawnFx = useCallback((cells: { pos: Coord }[]) => {
    if (!cells.length) return;
    setFx((prev) => {
      const next = [...prev];
      for (const { pos } of cells) next.push({ key: fxKey.current++, r: pos.r, c: pos.c });
      return next;
    });
    setTimeout(() => setFx((prev) => prev.slice(cells.length)), 420);
  }, []);

  // -------------------------------------------------------------------------
  // Reproduce una resolución (lista de pasos) con animación.
  // `shownStart` es el tablero ya renderizado (tras el swap visual).
  // -------------------------------------------------------------------------
  const playResolution = useCallback(
    async (steps: import("./types").CascadeStep[], shownStart: Board) => {
      let shown = shownStart;
      let cascade = 0;
      for (const step of steps) {
        // ids de las fichas que estallan en este paso (según el tablero visible)
        const ids = step.cleared
          .map(({ r, c }) => shown[r]?.[c]?.id)
          .filter((x): x is number => x != null);
        setPopping(new Set(ids));
        spawnFx(step.triggered);
        sounds.pop(cascade);
        haptic(8);
        if (step.triggered.length || step.created.length) sounds.special();
        if (step.matched.length >= 6 || cascade >= 2) setFeverFlash(true);
        await sleep(180);

        setBoard(step.board);
        setPopping(new Set());
        // marca el cartón con las bolas eliminadas
        markBalls(cardRef.current, step.clearedByColor);
        syncCard();
        scoreRef.current += step.score;
        setScore(scoreRef.current);

        // objetivo "recoger color"
        if (cfg.objective.type === "collect") {
          collectedRef.current += step.clearedByColor[cfg.objective.color] ?? 0;
          setCollected(collectedRef.current);
        }

        // fever
        const gained = step.clearedByColor.reduce((a, b) => a + b, 0);
        feverMeterRef.current = Math.min(100, feverMeterRef.current + gained * 7);
        setFeverMeter(feverMeterRef.current);
        if (feverMeterRef.current >= 100 && !feverActiveRef.current) {
          feverActiveRef.current = true;
          setFeverOn(true);
          setFeverFlash(true);
          feverMeterRef.current = 0;
          sounds.fever();
          haptic([20, 40, 20]);
        }

        // marca de "spawn" para las fichas nuevas de la fila superior
        const newIds = new Set<number>();
        for (let c = 0; c < n; c++) {
          const top = step.board[0]?.[c];
          if (top) newIds.add(top.id);
        }
        setSpawning(newIds);
        shown = step.board;
        cascade++;
        await sleep(230);
        setSpawning(new Set());
        setFeverFlash(false);
      }
      boardRef.current = shown;
      setBoard(shown);
    },
    [n, cfg, spawnFx, syncCard]
  );

  // -------------------------------------------------------------------------
  // Evalúa fin de partida y, si no hay jugadas, baraja.
  // -------------------------------------------------------------------------
  const settle = useCallback(async () => {
    const obj = cfg.objective;
    const goalMet =
      obj.type === "lines"
        ? countLines(cardRef.current) >= obj.count
        : obj.type === "collect"
        ? collectedRef.current >= obj.count
        : countIce(boardRef.current) === 0; // ice

    if (goalMet) {
      const ml = movesRef.current;
      let stars = 1;
      if (ml >= Math.ceil(cfg.moves * 0.2)) stars = 2;
      if (ml >= Math.ceil(cfg.moves * 0.4)) stars = 3;
      if (obj.type === "lines" && isFullCard(cardRef.current)) stars = 3;
      const xp = Math.round(cfg.level * 40 + stars * 60);
      sounds.bingo();
      haptic([30, 50, 30, 50, 80]);
      setResult({ win: true, stars, xp, level: cfg.level, score: scoreRef.current });
      return;
    }
    if (movesRef.current <= 0) {
      sounds.lose();
      setResult({ win: false, stars: 0, xp: 0, level: cfg.level, score: scoreRef.current });
      return;
    }
    // sin jugadas posibles -> barajar
    if (!hasPossibleMove(boardRef.current)) {
      shuffle(boardRef.current, rngRef.current);
      setBoard(cloneBoard(boardRef.current));
      await sleep(260);
    }
  }, [cfg]);

  // -------------------------------------------------------------------------
  // Ejecuta un movimiento (swap).
  // -------------------------------------------------------------------------
  const doMove = useCallback(
    async (a: Coord, d: Coord) => {
      if (busyRef.current || result) return;
      if (Math.abs(a.r - d.r) + Math.abs(a.c - d.c) !== 1) return;
      busyRef.current = true;
      setSelected(null);

      const feverMult = feverActiveRef.current ? 2 : 1;
      const work = cloneBoard(boardRef.current);
      const res = trySwap(work, a, d, rngRef.current, idRef.current, feverMult);

      // swap visual (clon que preserva ids -> coincide con el motor)
      const visual = cloneBoard(boardRef.current);
      const tmp = visual[a.r][a.c];
      visual[a.r][a.c] = visual[d.r][d.c];
      visual[d.r][d.c] = tmp;

      sounds.swap();
      if (!res) {
        // inválido: muestra swap y revierte con shake
        sounds.error();
        haptic(15);
        setBoard(visual);
        await sleep(140);
        setBoard(cloneBoard(boardRef.current));
        busyRef.current = false;
        return;
      }

      movesRef.current -= 1;
      setMoves(movesRef.current);
      setBoard(visual);
      await sleep(150);

      await playResolution(res.result.steps, visual);

      feverActiveRef.current = false;
      setFeverOn(false);
      await settle();
      busyRef.current = false;
    },
    [playResolution, result, settle]
  );

  // -------------------------------------------------------------------------
  // Booster martillo: destruye una bola y resuelve la cascada (sin gastar movimiento).
  // -------------------------------------------------------------------------
  const doHammer = useCallback(
    async (coord: Coord) => {
      if (busyRef.current || result || hammer <= 0) return;
      const cell = boardRef.current[coord.r]?.[coord.c];
      if (!cell || cell.ice > 0) return;
      busyRef.current = true;
      setHammerArmed(false);
      setHammer((h) => h - 1);

      const work = cloneBoard(boardRef.current);
      work[coord.r][coord.c] = null;
      // gravedad + cascada usando resolve sobre el hueco creado
      const visual = cloneBoard(boardRef.current);
      setPopping(new Set([cell.id]));
      spawnFx([{ pos: coord }]);
      await sleep(180);
      const result2 = resolve(work, null, rngRef.current, idRef.current, feverActiveRef.current ? 2 : 1);
      setPopping(new Set());
      if (result2.steps.length === 0) {
        // no hubo cascada: aplica solo el hueco rellenado
        boardRef.current = work;
        setBoard(cloneBoard(work));
      } else {
        await playResolution(result2.steps, visual);
      }
      await settle();
      busyRef.current = false;
    },
    [hammer, playResolution, result, settle, spawnFx]
  );

  // -------------------------------------------------------------------------
  // Booster barajar: reordena el tablero y resuelve matches accidentales.
  // -------------------------------------------------------------------------
  const doShuffle = useCallback(async () => {
    if (busyRef.current || result || shuffles <= 0) return;
    busyRef.current = true;
    setShuffles((s) => s - 1);
    setSelected(null);
    initAudio();
    sounds.special();
    haptic(20);
    shuffle(boardRef.current, rngRef.current);
    setBoard(cloneBoard(boardRef.current));
    await sleep(280);
    const work = cloneBoard(boardRef.current);
    const res = resolve(work, null, rngRef.current, idRef.current, 1);
    if (res.steps.length) await playResolution(res.steps, cloneBoard(boardRef.current));
    await settle();
    busyRef.current = false;
  }, [playResolution, result, settle, shuffles]);

  // -------------------------------------------------------------------------
  // Booster +5 movimientos.
  // -------------------------------------------------------------------------
  const doAddMoves = useCallback(() => {
    if (busyRef.current || result || extraMoves <= 0) return;
    setExtraMoves((m) => m - 1);
    movesRef.current += 5;
    setMoves(movesRef.current);
    initAudio();
    sounds.bonus();
    haptic(15);
  }, [extraMoves, result]);

  // -------------------------------------------------------------------------
  // Entrada: tap-tap o arrastre.
  // -------------------------------------------------------------------------
  const dragRef = useRef<{ coord: Coord; x: number; y: number } | null>(null);

  const cellFromPointer = useCallback(
    (e: React.PointerEvent): Coord | null => {
      const wrap = e.currentTarget as HTMLElement;
      const rect = wrap.getBoundingClientRect();
      const c = Math.floor(((e.clientX - rect.left) / rect.width) * n);
      const r = Math.floor(((e.clientY - rect.top) / rect.height) * n);
      if (r < 0 || c < 0 || r >= n || c >= n) return null;
      return { r, c };
    },
    [n]
  );

  const onBoardPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (busyRef.current || result) return;
      initAudio(); // desbloquea el audio en el primer gesto del usuario
      const coord = cellFromPointer(e);
      if (!coord) return;
      if (hammerArmed) {
        doHammer(coord);
        return;
      }
      if (selected) {
        if (Math.abs(selected.r - coord.r) + Math.abs(selected.c - coord.c) === 1) {
          doMove(selected, coord);
          return;
        }
      }
      setSelected(coord);
      dragRef.current = { coord, x: e.clientX, y: e.clientY };
    },
    [cellFromPointer, doHammer, doMove, hammerArmed, result, selected]
  );

  const onBoardPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || busyRef.current) return;
      const wrap = e.currentTarget as HTMLElement;
      const cellPx = wrap.getBoundingClientRect().width / n;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < cellPx * 0.45) return;
      const dir =
        Math.abs(dx) > Math.abs(dy)
          ? { r: 0, c: dx > 0 ? 1 : -1 }
          : { r: dy > 0 ? 1 : -1, c: 0 };
      const target = { r: drag.coord.r + dir.r, c: drag.coord.c + dir.c };
      dragRef.current = null;
      if (target.r >= 0 && target.c >= 0 && target.r < n && target.c < n) doMove(drag.coord, target);
    },
    [doMove, n]
  );

  const onBoardPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // -------------------------------------------------------------------------
  // Reinicio (reintentar) — mismo nivel.
  // -------------------------------------------------------------------------
  const restart = useCallback(() => {
    rngRef.current = makeRng(seedFor(level) ^ Math.floor(Math.random() * 1e9));
    idRef.current = makeIdGen(1);
    const b = createBoard(cfg, rngRef.current, idRef.current);
    boardRef.current = b;
    cardRef.current = createCard();
    feverMeterRef.current = 0;
    feverActiveRef.current = false;
    movesRef.current = cfg.moves;
    scoreRef.current = 0;
    collectedRef.current = 0;
    busyRef.current = false;
    setBoard(b);
    setCard(cardRef.current.map((row) => [...row]));
    setMoves(cfg.moves);
    setScore(0);
    setLines(0);
    setSelected(null);
    setFeverMeter(0);
    setFeverOn(false);
    setHammer(3);
    setHammerArmed(false);
    setShuffles(2);
    setExtraMoves(1);
    setCollected(0);
    setResult(null);
  }, [cfg, level]);

  // tamaño de celda en %
  const cellPct = 100 / n;

  // Texto/valor del objetivo según su tipo (para el HUD y el modal).
  const obj = cfg.objective;
  const goalValue =
    obj.type === "lines"
      ? `${lines}/${obj.count}`
      : obj.type === "collect"
      ? `${Math.min(collected, obj.count)}/${obj.count}`
      : `${iceLeft}`;
  const goalLabel =
    obj.type === "lines" ? (
      "LÍNEAS BINGO"
    ) : obj.type === "collect" ? (
      <>
        RECOGE <b style={{ color: HEADER_COLOR[obj.color] }}>{LETTERS[obj.color]}</b>
      </>
    ) : (
      "ROMPE HIELO ❄"
    );

  return (
    <div className="bm-root">
      <div className="bm-stage">
        <div className="bm-top">
          <button className="bm-back" onClick={onExit}>
            ← Mundo
          </button>
          <div className="bm-logo">
            Ball Match
            <small>BINGO BOLLA</small>
          </div>
          <button
            className="bm-back"
            onClick={toggleMute}
            aria-label={muted ? "Activar sonido" : "Silenciar"}
            title={muted ? "Activar sonido" : "Silenciar"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <div className="bm-lvlpill">Nivel {cfg.level}</div>
        </div>

        <div className="bm-hud">
          <div className="bm-card">
            <div className="bm-cardHdr">
              {LETTERS.map((L, i) => (
                <span key={L} style={{ background: HEADER_COLOR[i] }}>
                  {L}
                </span>
              ))}
            </div>
            <div className="bm-cardGrid">
              {card.map((row, r) =>
                row.map((marked, c) => {
                  const isFree = r === FREE[0] && c === FREE[1];
                  const inLine = lineCells.has(ckey(r, c));
                  return (
                    <div
                      key={ckey(r, c)}
                      className={`bm-cell${isFree ? " free" : ""}${marked && !isFree ? " mark" : ""}${
                        inLine ? " line" : ""
                      }`}
                    >
                      {isFree ? "★" : ""}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bm-side">
            <div className="bm-goal">
              <div className="v">{goalValue}</div>
              <div className="l">{goalLabel}</div>
            </div>
            <div className={`bm-moves${moves <= 5 ? " low" : ""}`}>
              <div className="v">{moves}</div>
              <div className="l">MOVIMIENTOS</div>
            </div>
          </div>
        </div>

        <div className={`bm-fever${feverOn ? " on" : ""}`}>
          <i style={{ width: `${feverOn ? 100 : feverMeter}%` }} />
        </div>

        <div className="bm-boardWrap">
          <div
            className="bm-board"
            onPointerDown={onBoardPointerDown}
            onPointerMove={onBoardPointerMove}
            onPointerUp={onBoardPointerUp}
            onPointerLeave={onBoardPointerUp}
          >
            {board.flatMap((row, r) =>
              row.map((cell, c) => {
                if (!cell) return null;
                const isSel = selected?.r === r && selected?.c === c;
                const cls = [
                  "bm-tile",
                  `bm-c${cell.color}`,
                  cell.special !== "none" ? `bm-${cell.special}` : "",
                  isSel ? "sel" : "",
                  popping.has(cell.id) ? "pop" : "",
                  spawning.has(cell.id) ? "spawn" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div
                    key={cell.id}
                    className={cls}
                    style={{
                      left: `${c * cellPct}%`,
                      top: `${r * cellPct}%`,
                      width: `${cellPct}%`,
                      height: `${cellPct}%`,
                    }}
                  >
                    <div className="bm-face">
                      {cell.special === "bomb" ? null : <span className="bm-letter">{LETTERS[cell.color]}</span>}
                    </div>
                    {cell.ice > 0 && <div className="bm-ice" />}
                  </div>
                );
              })
            )}
            {fx.map((f) => (
              <div
                key={f.key}
                className="bm-fx"
                style={{
                  left: `${f.c * cellPct}%`,
                  top: `${f.r * cellPct}%`,
                  width: `${cellPct}%`,
                  height: `${cellPct}%`,
                }}
              />
            ))}
            {feverFlash && (
              <div className="bm-feverflash">
                <span>¡COMBO!</span>
              </div>
            )}

            {result && (
              <div className="bm-overlay">
                {result.win && <Confetti />}
                <div className={`bm-result ${result.win ? "win" : "lose"}`}>
                  <h2>{result.win ? "¡BINGO!" : "Sin movimientos"}</h2>
                  <div className="bm-stars">
                    {[1, 2, 3].map((s) => (
                      <span key={s} className={`s${result.stars >= s ? " on" : ""}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  <div className="bm-resrow">
                    <span>Puntos</span>
                    <b>{result.score.toLocaleString("es")}</b>
                  </div>
                  <div className="bm-resrow">
                    <span>Objetivo</span>
                    <b>{goalValue}</b>
                  </div>
                  {result.win && (
                    <div className="bm-resrow">
                      <span>Recompensa</span>
                      <b>+{result.xp} EXP</b>
                    </div>
                  )}
                  {result.win ? (
                    <button className="bm-btn" onClick={() => onComplete(result)}>
                      CONTINUAR ▶
                    </button>
                  ) : (
                    <button className="bm-btn" onClick={restart}>
                      REINTENTAR
                    </button>
                  )}
                  <button className="bm-btn ghost" onClick={onExit}>
                    Volver al mundo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bm-boosters">
          <button
            className={`bm-bst${hammerArmed ? " armed" : ""}`}
            disabled={hammer <= 0 || !!result}
            onClick={() => setHammerArmed((a) => !a)}
            title="Destruye una bola"
          >
            🔨 <span className="n">{hammer}</span>
          </button>
          <button
            className="bm-bst"
            disabled={shuffles <= 0 || !!result}
            onClick={doShuffle}
            title="Baraja el tablero"
          >
            ♻️ <span className="n">{shuffles}</span>
          </button>
          <button
            className="bm-bst"
            disabled={extraMoves <= 0 || !!result}
            onClick={doAddMoves}
            title="+5 movimientos"
          >
            ➕5 <span className="n">{extraMoves}</span>
          </button>
          <div className="bm-scorebar">
            <span>
              PUNTOS <b>{score.toLocaleString("es")}</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const CONFETTI_COLORS = ["#ff3d7f", "#ffd93d", "#00e5ff", "#b388ff", "#00e676"];

/** Lluvia de confeti con los colores de marca para la pantalla de victoria. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.6 + Math.random() * 1.3,
        rot: (Math.random() - 0.5) * 720,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 8,
      })),
    []
  );
  return (
    <div className="bm-confetti">
      {pieces.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ["--rot" as any]: `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  );
}
