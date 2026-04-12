"use client";

import { useState, useEffect, useRef } from "react";
import BellDash from "./BellDash";

const CRAVE_DURATION_SECONDS = 10 * 60; // 10 minutes

export default function CraveCracker() {
  const [isActive, setIsActive] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CRAVE_DURATION_SECONDS);
  const intervalRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    if (!isActive) return;
    if (secondsLeft <= 0) {
      setIsActive(false);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isActive, secondsLeft]);

  function startCrave() {
    setIsActive(true);
    setSecondsLeft(CRAVE_DURATION_SECONDS);
  }

  function resolve(survived) {
    setIsActive(false);
    // In a real app, we'd save this. For now, just reset.
    console.log(`Crave resolved: ${survived}`);
  }
  
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const pct = (secondsLeft / CRAVE_DURATION_SECONDS) * 100;
  const isExpired = secondsLeft === 0 && isActive;

  if (!isActive) {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-2xl text-center px-5 py-5 max-w-sm mx-auto">
        <p className="font-heading font-bold text-xl text-primary mb-1">Feeling a Craving?</p>
        <p className="text-sm text-on-surface-variant mb-4 leading-snug">
          Cravings often fade in about 10 minutes. Start the timer and see if you can ride it out.
        </p>
        <button
          onClick={startCrave}
          className="btn-primary w-full text-base py-3.5 rounded-2xl font-bold bg-purple-600 text-white"
        >
          Start 10-Minute Timer
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col bg-slate-900`}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "80px" }}
    >
      {isExpired ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-center">
            <p className="font-heading font-bold text-3xl mb-2 text-white">Time's up!</p>
            <p className="text-sm text-slate-300">You made it 10 minutes. How do you feel?</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <button
              onClick={() => resolve(true)}
              className="w-full bg-green-500 text-white font-bold py-5 rounded-2xl text-xl"
            >
              I Survived It
            </button>
            <button
              onClick={() => resolve(false)}
              className="w-full bg-slate-700 text-slate-300 font-semibold py-4 rounded-2xl text-base"
            >
              I Gave In
            </button>
          </div>
        </div>
      ) : (
        <div className={`flex-1 flex flex-col items-center justify-center transition-colors duration-1000`}>
          <p className="text-sm font-semibold text-purple-400 mb-4 tracking-widest uppercase text-[11px]">
            Crave Cracker
          </p>

          <div className="relative w-56 h-56 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 220 220">
              <circle cx="110" cy="110" r="96" fill="none" stroke="#374151" strokeWidth="14" />
              <circle
                cx="110" cy="110" r="96"
                fill="none"
                stroke={pct > 50 ? "#4CAF50" : pct > 20 ? "#FFC107" : "#F44336"}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 96}`}
                strokeDashoffset={`${2 * Math.PI * 96 * (1 - pct / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <p className="font-heading text-4xl font-bold tabular-nums tracking-tight">
                {`${minutes}:${String(seconds).padStart(2, "0")}`}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">remaining</p>
            </div>
          </div>

          <p className="text-sm text-slate-300 text-center px-8 mb-5">
            Ride the wave. This feeling will pass. You're stronger than the craving.
          </p>

          <div className="w-full px-4 flex flex-col gap-3 max-w-sm">
            {!showGame ? (
              <button
                onClick={() => setShowGame(true)}
                className="w-full text-left active:scale-95 transition-all bg-purple-600 rounded-2xl px-4 py-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                  🎮
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-base">Play a Game</p>
                  <p className="text-white/70 text-xs mt-0.5">A little distraction can make all the difference.</p>
                </div>
                <span className="text-white/60 text-lg">›</span>
              </button>
            ) : (
              <div className="bg-slate-800 p-3 rounded-2xl">
                <BellDash onClose={() => setShowGame(false)} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
