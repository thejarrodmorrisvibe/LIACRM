import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";

type Accent = "blue" | "cyan" | "emerald" | "amber" | "violet";

const ACCENTS: Record<Accent, { ring: string; icon: string; glow: string }> = {
  blue: { ring: "text-accent", icon: "bg-accent-soft text-accent", glow: "from-accent/12" },
  cyan: { ring: "text-accent-2", icon: "bg-[#dbf6fb] text-accent-2", glow: "from-accent-2/12" },
  emerald: { ring: "text-ok", icon: "bg-ok-soft text-ok", glow: "from-ok/12" },
  amber: { ring: "text-warn", icon: "bg-warn-soft text-warn", glow: "from-warn/12" },
  violet: { ring: "text-info", icon: "bg-info-soft text-info", glow: "from-info/12" },
};

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "blue",
  className,
  onClick,
  active = false,
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  accent?: Accent;
  className?: string;
  onClick?: () => void;
  active?: boolean;
  href?: string;
}) {
  const a = ACCENTS[accent];
  const interactive = !!(onClick || href);

  const classes = cn(
    "relative block overflow-hidden rounded-[var(--radius-lg)] bg-surface border p-5 text-left shadow-[var(--shadow-card)] transition-all",
    interactive && "cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--shadow-pop)]",
    active ? "border-accent ring-2 ring-accent/30" : "border-line",
    className,
  );

  const inner = (
    <>
      <div className={cn("pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl", a.glow)} />
      <div className="relative flex items-start justify-between">
        <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        {icon && <span className={cn("grid h-9 w-9 place-items-center rounded-[var(--radius-sm)]", a.icon)}>{icon}</span>}
      </div>
      <div className="relative mt-2 font-display text-[30px] font-bold leading-none text-ink nums">{value}</div>
      {sub && <p className={cn("relative mt-2 text-[13px] font-medium", a.ring)}>{sub}</p>}
    </>
  );

  if (href) {
    return <Link href={href} className={classes}>{inner}</Link>;
  }
  if (onClick) {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
        className={classes}
      >
        {inner}
      </div>
    );
  }
  return <div className={classes}>{inner}</div>;
}
