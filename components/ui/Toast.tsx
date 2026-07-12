"use client";

import { cn } from "@/lib/utils";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastTone = "ok" | "bad" | "info";
type Toast = { id: number; message: string; tone: ToastTone };

const ToastCtx = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

const TONE_STYLES: Record<ToastTone, { bar: string; icon: ReactNode }> = {
  ok: {
    bar: "bg-ok",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  bad: {
    bar: "bg-bad",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 8v5M12 16.5v.01" /><circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  info: {
    bar: "bg-accent",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 11v5M12 7.5v.01" /><circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let nextId = 0;

  const push = useCallback((message: string, tone: ToastTone = "ok") => {
    const id = Date.now() + nextId++;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5">
        {toasts.map((t) => {
          const s = TONE_STYLES[t.tone];
          return (
            <div
              key={t.id}
              className="pop pointer-events-auto flex items-center gap-3 overflow-hidden rounded-[var(--radius-md)] bg-surface pl-0 pr-4 py-3 shadow-[var(--shadow-pop)] border border-line min-w-[260px]"
            >
              <span className={cn("h-full w-1 self-stretch rounded-full", s.bar)} />
              <span className={cn(
                "grid h-6 w-6 place-items-center rounded-full text-white",
                t.tone === "ok" && "bg-ok",
                t.tone === "bad" && "bg-bad",
                t.tone === "info" && "bg-accent",
              )}>
                {s.icon}
              </span>
              <span className="text-sm font-medium text-ink">{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
