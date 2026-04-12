"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { saveHighScore, getHighScore } from "../../lib/games";

// ─── Whack-a-Junk — Whack-a-Mole clone ────────────────────────────────────────
const HOLES = 9;
const GAME_DURATION = 30; // seconds
const BASE_SHOW_MS = 1100;
const MIN_SHOW_MS = 500;

// Junk food (whack) vs healthy (avoid)
const JUNK = ["🍔", "🍟", "🍩", "🥤", "🍪", "🍕", "🍭", "🧁"];
const HEALTHY = ["🥦", "🍎", "💧", "🥕", "🌿", "🫐", "🥑"];

function makeHoles() {
  return Array.from({ length: HOLES }, () => ({ icon: "", isJunk: false, visible: false, hit: false }));
}

export default function WhackAJunk({ onClose }) {
  const [phase, setPhase] = useState("idle");
  const [holes, setHoles] = useState(makeHoles);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [bestScore, setBestScore] = useState(0);
  const [lastHit, setLastHit] = useState(null);
  const timersRef = useRef(Array(HOLES).fill(null));
  const gameTimerRef = useRef(null);
  const tickRef = useRef(0);

  useEffect(() => {
    setBestScore(getHighScore("whack-a-junk"));
  }, []);

  const popHole = useCallback((i, level) => {
    const isJunk = Math.random() < 0.65;
    const icon = isJunk
      ? JUNK[Math.floor(Math.random() * JUNK.length)]
      : HEALTHY[Math.floor(Math.random() * HEALTHY.length)];
    const showMs = Math.max(MIN_SHOW_MS, BASE_SHOW_MS - level * 40);

    setHoles((prev) => {
      const next = [...prev];
      next[i] = { icon, isJunk, visible: true, hit: false };
      return next;
    });

    timersRef.current[i] = setTimeout(() => {
      setHoles((prev) => {
        if (!prev[i].visible || prev[i].hit) return prev;
        const next = [...prev];
        next[i] = { ...next[i], visible: false };
        return next;
      });
    }, showMs);
  }, []);

  const startGame = useCallback(() => {
    setHoles(makeHoles());
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setPhase("playing");
    tickRef.current = 0;
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    gameTimerRef.current = setInterval(() => {
      tickRef.current++;
      setTimeLeft((t) => {
        if (t <= 1) {
          setPhase("done");
          setScore((s) => { saveHighScore("whack-a-junk", s); setBestScore(getHighScore("whack-a-junk")); return s; });
          if (gameTimerRef.current) clearInterval(gameTimerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, []);

  // Pop random holes while playing
  useEffect(() => {
    if (phase !== "playing") return;
    let running = true;
    const tick = () => {
      if (!running) return;
      const emptyHoles = holes.map((h, i) => (!h.visible && !h.hit ? i : -1)).filter((i) => i >= 0);
      if (emptyHoles.length > 0) {
        const i = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
        popHole(i, tickRef.current);
      }
      const delay = Math.max(250, 600 - tickRef.current * 8);
      setTimeout(tick, delay);
    };
    const t = setTimeout(tick, 300);
    return () => { running = false; clearTimeout(t); };
  }, [phase, popHole, holes]);

  useEffect(() => {
    return () => { if (gameTimerRef.current) clearInterval(gameTimerRef.current); };
  }, []);

  const whack = useCallback((i) => {
    if (phase !== "playing") return;
    const hole = holes[i];
    if (!hole.visible || hole.hit) return;
    setHoles((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], hit: true, visible: false };
      return next;
    });
    if (hole.isJunk) {
      setScore((s) => s + 10);
      setLastHit({ hole: i, text: "+10 🔨" });
    } else {
      setScore((s) => Math.max(0, s - 5));
      setLastHit({ hole: i, text: "-5 🚫" });
    }
    setTimeout(() => setLastHit(null), 600);
    if (timersRef.current[i]) clearTimeout(timersRef.current[i]);
  }, [phase, holes]);

  useEffect(() => {
    const onKey = (e) => { if (e.code === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const urgency = timeLeft <= 10 ? "text-red-400 animate-pulse" : "text-amber-300";

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      {/* HUD */}
      <div className="flex gap-6 text-sm font-mono text-white/80 w-full max-w-xs justify-between px-2">
        <span>🔨 Score: <strong className="text-yellow-300">{score}</strong></span>
        <span className={urgency}>⏱ {timeLeft}s</span>
        <span>🏆 Best: <strong className="text-yellow-300">{bestScore}</strong></span>
      </div>

      {/* Holes grid */}
      <div className="grid grid-cols-3 gap-3" style={{ width: "min(300px, 90vw)" }}>
        {holes.map((hole, i) => (
          <button
            key={i}
            onPointerDown={() => whack(i)}
            className={[
              "aspect-square rounded-2xl flex items-center justify-center text-4xl",
              "transition-all duration-100 border-2 relative overflow-hidden",
              "active:scale-90",
              hole.visible && !hole.hit
                ? hole.isJunk
                  ? "border-red-400 bg-red-900/30 scale-105 animate-bounce"
                  : "border-green-400 bg-green-900/30 scale-105"
                : "border-white/10 bg-white/5",
            ].join(" ")}
          >
            {hole.visible && !hole.hit ? hole.icon : "🕳️"}
            {lastHit?.hole === i && (
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold animate-ping pointer-events-none">
                {lastHit.text}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Legend */}
      <p className="text-xs text-white/50">Whack junk food 🍔 · Spare healthy food 🥦</p>

      {/* Overlay */}
      {phase !== "playing" && (
        <div className="text-center flex flex-col items-center gap-3">
          {phase === "idle" && (
            <>
              <p className="text-lg font-bold text-amber-300">🔨 Whack-a-Junk</p>
              <p className="text-sm text-white/60">Tap junk food to smash it. Don&apos;t hit the healthy snacks!</p>
              <button onClick={startGame} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 rounded-2xl font-bold text-white text-lg transition-all active:scale-95">
                Start!
              </button>
            </>
          )}
          {phase === "done" && (
            <>
              <p className="text-2xl font-bold text-amber-300">⏰ Time&apos;s Up!</p>
              <p className="text-lg text-white">Score: <strong className="text-yellow-300">{score}</strong></p>
              {score >= bestScore && score > 0 && <p className="text-green-400 font-bold">🏆 New Best!</p>}
              <button onClick={startGame} className="px-6 py-2 bg-amber-500 hover:bg-amber-400 rounded-2xl font-bold text-white transition-all active:scale-95">
                Play Again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
