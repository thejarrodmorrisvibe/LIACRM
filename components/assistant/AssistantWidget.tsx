"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send } from "@/components/icons";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Which clients/locations have A&P openings?",
  "How am I tracking on this week's KPIs?",
  "Who's starting in the next 2 weeks?",
  "Summarize my hot openings by discipline.",
];

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : (data.error || "Something went wrong.");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Couldn't reach the assistant. Check your connection and try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="brand-gradient fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full text-white shadow-[var(--shadow-glow)] transition hover:brightness-110 lg:bottom-6 lg:right-6"
      >
        {open
          ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          : <Sparkles width={24} height={24} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-40 flex h-[560px] max-h-[calc(100vh-7rem)] w-[380px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-[var(--shadow-pop)] lg:right-6">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-line bg-gradient-to-r from-accent-soft/60 to-surface px-4 py-3">
            <span className="brand-gradient grid h-8 w-8 place-items-center rounded-[10px] text-white"><Sparkles width={17} height={17} /></span>
            <div className="min-w-0">
              <div className="font-display text-[14px] font-bold text-ink">Lia&apos;s Assistant</div>
              <div className="text-[11px] text-muted">Ask about your stats, openings, or pipeline</div>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-[13px] leading-relaxed text-muted">
                  Hey Lia. Ask me anything about your dashboard, openings, submittals, KPIs, or commissions.
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)}
                      className="rounded-[10px] border border-line-strong bg-surface-2/50 px-3 py-2 text-left text-[12.5px] font-medium text-ink-soft transition hover:border-accent hover:text-accent">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-[14px] px-3.5 py-2.5 text-[13px] leading-relaxed",
                  m.role === "user"
                    ? "brand-gradient rounded-br-sm text-white"
                    : "rounded-bl-sm border border-line bg-surface-2/60 text-ink",
                )}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-[14px] rounded-bl-sm border border-line bg-surface-2/60 px-3.5 py-3">
                  <Dot /><Dot delay="150ms" /><Dot delay="300ms" />
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-line p-3">
            <div className="flex items-end gap-2">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask a question…"
                className="scroll-thin max-h-28 flex-1 resize-none rounded-[var(--radius-sm)] border border-line-strong bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
              <button
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="brand-gradient grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-white transition hover:brightness-110 disabled:opacity-40"
              >
                <Send width={16} height={16} />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[10.5px] text-faint">Answers come from your live CRM data. It can't make changes.</p>
          </div>
        </div>
      )}
    </>
  );
}

function Dot({ delay }: { delay?: string }) {
  return <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted" style={{ animationDelay: delay }} />;
}
