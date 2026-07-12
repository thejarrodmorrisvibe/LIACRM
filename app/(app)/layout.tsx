import { AppFrame } from "@/components/layout/AppFrame";
import { ToastProvider } from "@/components/ui/Toast";
import { listCandidates } from "@/lib/actions/candidates";
import { currentQuarterAccrued, quarterOf } from "@/lib/commission";
import { isSupabaseConfigured, AUTH_DISABLED } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  let userEmail: string | undefined;

  if (isSupabaseConfigured && !AUTH_DISABLED) {
    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) redirect("/login");
    userEmail = user.email ?? undefined;
  }

  const candidates = await listCandidates();
  const spans = candidates
    .filter((c) => c.start_date)
    .map((c) => ({ start: c.start_date as string, end: c.end_date }));
  const now = new Date();
  const quarterTotal = currentQuarterAccrued(spans, now);
  const quarterLabel = quarterOf(now).replace("-", " ");

  return (
    <ToastProvider>
      <AppFrame
        quarterTotal={quarterTotal}
        quarterLabel={quarterLabel}
        demo={!isSupabaseConfigured}
        authDisabled={AUTH_DISABLED}
        userEmail={userEmail}
      >
        {children}
      </AppFrame>
    </ToastProvider>
  );
}
