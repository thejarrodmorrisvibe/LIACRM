"use client";

import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Sparkles, Gauge, Kanban, Dollar } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, AUTH_DISABLED } from "@/lib/supabase/config";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  // Open-access mode: no login needed, send straight into the app.
  useEffect(() => {
    if (AUTH_DISABLED) {
      router.replace("/roster");
    }
  }, [router]);

  // If a magic link lands here with a ?code=, finish sign-in client-side.
  useEffect(() => {
    if (!isSupabaseConfigured || AUTH_DISABLED) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (params.get("error_description")) {
      setError(params.get("error_description"));
      return;
    }
    if (!code) return;
    setExchanging(true);
    createClient()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setError("That sign-in link expired. Send yourself a new one.");
          setExchanging(false);
        } else {
          router.replace("/roster");
          router.refresh();
        }
      });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <div className="command-bg relative hidden flex-col justify-between p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="brand-gradient grid h-11 w-11 place-items-center rounded-[14px] shadow-[var(--shadow-glow)]">
            <Sparkles width={24} height={24} />
          </div>
          <div>
            <div className="font-display text-xl font-extrabold">Lia&apos;s</div>
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
              CRM
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="font-display text-[40px] font-extrabold leading-[1.08]">
            Mission control for <span className="brand-text">aerospace staffing</span>.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/55">
            Track every candidate from first call to first shift. Manage your pipeline, hot jobs,
            tasks, and quarterly commissions, all in one place.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: Gauge, t: "Active roster & live commission tracking" },
              { icon: Kanban, t: "Drag-and-drop candidate pipeline" },
              { icon: Dollar, t: "Quarterly earnings, estimated automatically" },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="flex items-center gap-3 text-[14px] text-white/75">
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white/10 text-accent-2">
                  <Icon width={17} height={17} />
                </span>
                {t}
              </div>
            ))}
          </div>
        </div>

        <p className="text-[12px] text-white/35">Built for one recruiter. Private by design.</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="brand-gradient mb-3 grid h-11 w-11 place-items-center rounded-[14px]">
              <Sparkles width={24} height={24} className="text-white" />
            </div>
            <h1 className="font-display text-2xl font-extrabold text-ink">Lia&apos;s CRM</h1>
          </div>

          <h2 className="font-display text-[22px] font-bold text-ink">Welcome back</h2>
          <p className="mt-1 text-[14px] text-muted">Sign in to your command center.</p>

          {exchanging ? (
            <div className="mt-6 flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
              <p className="text-[14px] font-medium text-ink">Signing you in…</p>
            </div>
          ) : !isSupabaseConfigured ? (
            <div className="mt-6 rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
              <p className="text-[13.5px] leading-relaxed text-ink-soft">
                The database isn&apos;t connected yet. You can explore the full app right now with
                realistic sample data. Sign-in turns on once Supabase is linked.
              </p>
              <Button className="mt-4 w-full" onClick={() => router.push("/roster")}>
                Enter the demo
              </Button>
            </div>
          ) : sent ? (
            <div className="mt-6 rounded-[var(--radius-lg)] border border-ok/30 bg-ok-soft/50 p-5">
              <p className="font-display text-[15px] font-bold text-ink">Check your email</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
                We sent a sign-in link to <strong>{email}</strong>. Click it to sign in. You can
                close this tab once you do.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-3 text-[13px] font-semibold text-accent hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <Field label="Email" hint="We'll email you a one-tap sign-in link. No password needed.">
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </Field>
              {error && (
                <p className="rounded-[var(--radius-sm)] bg-bad-soft px-3 py-2 text-[13px] font-medium text-bad">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Sending link…" : "Email me a sign-in link"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
