"use client";

import { cn, usd } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import {
  Gauge, Kanban, Briefcase, CheckSquare, Dollar, Logout, Menu, Sparkles, Send, Grid, Gift, CalendarClock, Activity, Flame,
} from "@/components/icons";

type Item = { href: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>>; hint: string };

const NAV: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: Grid, hint: "Your week at a glance" },
  { href: "/activity", label: "Activity", icon: Activity, hint: "KPI, outreach & tally" },
  { href: "/roster", label: "Active Roster", icon: Gauge, hint: "Who's working now" },
  { href: "/pipeline", label: "Pipeline", icon: Kanban, hint: "Candidate stages" },
  { href: "/submittals", label: "Submittals", icon: Send, hint: "Running submit log" },
  { href: "/interviews", label: "Interviews", icon: CalendarClock, hint: "Scheduled interviews" },
  { href: "/jobs", label: "Job Openings", icon: Briefcase, hint: "Open reqs & hot list" },
  { href: "/hot-openings", label: "Hot Openings", icon: Flame, hint: "Reqs by client & discipline" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, hint: "Tasks & brain dump" },
  { href: "/referrals", label: "Referrals", icon: Gift, hint: "$250 bonus tracker" },
  { href: "/commissions", label: "Commissions", icon: Dollar, hint: "Quarterly estimate" },
];

export function AppFrame({
  children,
  quarterTotal,
  quarterLabel,
  demo,
  authDisabled,
  userEmail,
}: {
  children: ReactNode;
  quarterTotal: number;
  quarterLabel: string;
  demo: boolean;
  authDisabled?: boolean;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function signOut() {
    if (!demo) await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const SidebarInner = (
    <div className="command-bg flex h-full w-[260px] flex-col text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="brand-gradient grid h-10 w-10 place-items-center rounded-[13px] shadow-[var(--shadow-glow)]">
          <Sparkles width={22} height={22} className="text-white" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-[17px] font-extrabold tracking-tight">Lia&apos;s</div>
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
            CRM
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const on = active(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-[12px] px-3 py-2.5 transition-all",
                on ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              {on && (
                <span className="brand-gradient absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full" />
              )}
              <Icon
                width={19}
                height={19}
                className={cn("shrink-0 transition-colors", on ? "text-accent-2" : "text-white/55 group-hover:text-white/90")}
              />
              <span className="flex-1">
                <span className="block text-[13.5px] font-semibold leading-tight">{item.label}</span>
                <span className={cn("block text-[11px] leading-tight", on ? "text-white/55" : "text-white/35")}>
                  {item.hint}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Quarter mini-KPI */}
      <div className="mx-3 mb-3 rounded-[14px] border border-white/10 bg-white/[0.04] p-4">
        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-white/45">
          {quarterLabel} Commission
        </div>
        <div className="mt-1 font-display text-[24px] font-bold nums brand-text">{usd(quarterTotal)}</div>
        <div className="text-[11px] text-white/40">accruing this quarter</div>
      </div>

      {/* Account */}
      <div className="border-t border-white/10 px-3 py-3">
        {authDisabled ? (
          <div className="flex items-center gap-3 rounded-[11px] px-3 py-2 text-white/45">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-accent-2">
              <Sparkles width={15} height={15} />
            </span>
            <span className="flex-1 truncate text-[12px] font-medium leading-tight">
              Open access
              <span className="block text-[10.5px] text-white/35">No login required</span>
            </span>
          </div>
        ) : (
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-[11px] px-3 py-2 text-left text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Logout width={18} height={18} />
            <span className="flex-1 truncate text-[12.5px] font-medium">
              {demo ? "Demo mode · sign in" : userEmail ?? "Sign out"}
            </span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block shrink-0">{SidebarInner}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/55 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full shadow-2xl pop">{SidebarInner}</div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface/80 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-[10px] text-ink-soft hover:bg-surface-2 lg:hidden"
            aria-label="Open menu"
          >
            <Menu />
          </button>
          <div className="flex-1" />
          {demo && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1 text-[11.5px] font-semibold text-warn">
              <span className="h-1.5 w-1.5 rounded-full bg-warn" /> Demo data · connect Supabase to save
            </span>
          )}
          <div className="flex items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-1.5">
            <Dollar width={16} height={16} className="text-ok" />
            <span className="text-[12px] font-medium text-muted">{quarterLabel}</span>
            <span className="font-display text-[15px] font-bold text-ink nums">{usd(quarterTotal)}</span>
          </div>
        </header>
        <main className="scroll-thin flex-1 overflow-y-auto scroll-smooth">{children}</main>
      </div>
    </div>
  );
}
