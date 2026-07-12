"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type Mode = "focus" | "short" | "long";

const MODES: Record<Mode, { label: string; minutes: number; accent: string; soft: string }> = {
  focus: { label: "Focus", minutes: 25, accent: "var(--color-accent)", soft: "bg-accent-soft text-accent" },
  short: { label: "Short Break", minutes: 5, accent: "var(--color-ok)", soft: "bg-ok-soft text-ok" },
  long: { label: "Long Break", minutes: 15, accent: "var(--color-accent-2)", soft: "bg-[#dbf6fb] text-accent-2" },
};
const ORDER: Mode[] = ["focus", "short", "long"];

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1175].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.start(t); o.stop(t + 0.5);
    });
  } catch { /* ignore */ }
}

export function PomodoroTimer() {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(MODES.focus.minutes * 60);
  const [running, setRunning] = useState(false);
  const [doneToday, setDoneToday] = useState(0);
  const [cycle, setCycle] = useState(0); // completed focus sessions toward a long break
  const endRef = useRef<number>(0);

  // Load today's completed-session count.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("apex-pomodoro");
      const today = new Date().toISOString().slice(0, 10);
      if (raw) {
        const v = JSON.parse(raw) as { date: string; count: number };
        if (v.date === today) setDoneToday(v.count);
      }
    } catch { /* ignore */ }
  }, []);

  function persist(count: number) {
    try {
      localStorage.setItem("apex-pomodoro", JSON.stringify({ date: new Date().toISOString().slice(0, 10), count }));
    } catch { /* ignore */ }
  }

  // Tick using an absolute end-time so it stays accurate even if the tab sleeps.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) complete();
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Reflect the countdown in the browser tab title while running.
  useEffect(() => {
    if (running) document.title = `${fmt(secondsLeft)} · ${MODES[mode].label} — Lia's CRM`;
    else document.title = "Lia's CRM";
    return () => { document.title = "Lia's CRM"; };
  }, [running, secondsLeft, mode]);

  function switchTo(next: Mode, autostart = false) {
    setMode(next);
    setSecondsLeft(MODES[next].minutes * 60);
    if (autostart) {
      endRef.current = Date.now() + MODES[next].minutes * 60 * 1000;
      setRunning(true);
    } else {
      setRunning(false);
    }
  }

  function complete() {
    setRunning(false);
    chime();
    if (mode === "focus") {
      const count = doneToday + 1;
      setDoneToday(count);
      persist(count);
      const nextCycle = cycle + 1;
      setCycle(nextCycle % 4);
      const next: Mode = nextCycle % 4 === 0 ? "long" : "short";
      toast(`Focus session done — time for a ${MODES[next].label.toLowerCase()}`);
      switchTo(next);
    } else {
      toast("Break over — back to focus");
      switchTo("focus");
    }
  }

  function toggle() {
    if (running) {
      setRunning(false);
    } else {
      if (secondsLeft <= 0) setSecondsLeft(MODES[mode].minutes * 60);
      endRef.current = Date.now() + (secondsLeft > 0 ? secondsLeft : MODES[mode].minutes * 60) * 1000;
      setRunning(true);
    }
  }
  function reset() {
    setRunning(false);
    setSecondsLeft(MODES[mode].minutes * 60);
  }
  function skip() {
    const next = mode === "focus" ? "short" : "focus";
    switchTo(next);
  }

  const total = MODES[mode].minutes * 60;
  const progress = total > 0 ? (total - secondsLeft) / total : 0;
  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <Card className="mt-5 p-5">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        {/* Ring */}
        <div className="relative grid h-[150px] w-[150px] shrink-0 place-items-center">
          <svg width="150" height="150" viewBox="0 0 130 130" className="-rotate-90">
            <circle cx="65" cy="65" r={R} fill="none" stroke="var(--color-line)" strokeWidth="9" />
            <circle
              cx="65" cy="65" r={R} fill="none" stroke={MODES[mode].accent} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
              style={{ transition: "stroke-dashoffset 0.4s linear" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-display text-[34px] font-extrabold leading-none text-ink nums tabular-nums">{fmt(secondsLeft)}</span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{MODES[mode].label}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="w-full flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[15px] font-bold text-ink">Focus Timer</h3>
            <span className="text-[12.5px] text-muted">{doneToday} {doneToday === 1 ? "session" : "sessions"} today</span>
          </div>

          {/* Mode tabs */}
          <div className="mt-3 flex gap-1.5">
            {ORDER.map((m) => (
              <button
                key={m}
                onClick={() => switchTo(m)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                  mode === m ? MODES[m].soft : "bg-surface-2 text-muted hover:text-ink",
                )}
              >
                {MODES[m].label}
              </button>
            ))}
          </div>

          {/* Buttons */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={toggle}
              className="brand-gradient inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] text-[15px] font-bold text-white shadow-[var(--shadow-glow)] transition hover:brightness-110"
            >
              {running ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg> Pause</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5z" /></svg> {secondsLeft === total ? "Start" : "Resume"}</>
              )}
            </button>
            <button onClick={reset} aria-label="Reset" className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] border border-line-strong text-ink-soft transition hover:bg-surface-2">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
            </button>
            <button onClick={skip} aria-label="Skip" className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] border border-line-strong text-ink-soft transition hover:bg-surface-2">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4l10 8-10 8z" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
