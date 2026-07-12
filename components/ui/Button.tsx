import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "brand-gradient text-white shadow-[var(--shadow-glow)] hover:brightness-110 active:brightness-95",
  secondary:
    "bg-surface text-ink border border-line-strong hover:bg-surface-2 hover:border-faint",
  subtle:
    "bg-accent-soft text-accent hover:bg-[color-mix(in_srgb,var(--color-accent-soft),var(--color-accent)_8%)]",
  ghost: "text-ink-soft hover:bg-surface-2 hover:text-ink",
  danger: "bg-bad text-white hover:brightness-110 active:brightness-95",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-10 px-4 text-sm gap-2 rounded-[var(--radius-sm)]",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-[var(--radius-md)]",
  icon: "h-9 w-9 rounded-[var(--radius-sm)] justify-center",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center font-semibold whitespace-nowrap select-none",
        "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-1 focus-visible:ring-offset-surface",
        "disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
