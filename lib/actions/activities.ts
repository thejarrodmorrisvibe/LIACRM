"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demo, uid } from "@/lib/store/demo";
import type { Activity } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/activity");
  revalidatePath("/dashboard");
  revalidatePath("/outreach");
}

/** Optional tags attached to a logged activity (which client / job it was for, plus a free-text note). */
export interface ActivityMeta {
  client_name?: string | null;
  job_id?: string | null;
  job_label?: string | null;
  notes?: string | null;
}

/** Recent activity events (last ~45 days — covers this day/week/month). */
export async function listActivities(): Promise<Activity[]> {
  const since = new Date(Date.now() - 45 * 86_400_000).toISOString();
  if (!isSupabaseConfigured) {
    return demo.activities.filter((a) => a.occurred_at >= since);
  }
  const sb = await createClient();
  const { data } = await sb.from("activities").select("*").gte("occurred_at", since).order("occurred_at", { ascending: false });
  return (data ?? []) as Activity[];
}

/** Every activity event ever (for the weekly KPI history — no 45-day cap). */
export async function listAllActivities(): Promise<Activity[]> {
  if (!isSupabaseConfigured) {
    return [...demo.activities].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  }
  const sb = await createClient();
  const { data } = await sb.from("activities").select("*").order("occurred_at", { ascending: false });
  return (data ?? []) as Activity[];
}

/** All outreach events ever (for the Outreach breakdown page — no 45-day cap). */
export async function listOutreach(): Promise<Activity[]> {
  if (!isSupabaseConfigured) {
    return demo.activities
      .filter((a) => a.type === "outreach")
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
  }
  const sb = await createClient();
  const { data } = await sb
    .from("activities")
    .select("*")
    .eq("type", "outreach")
    .order("occurred_at", { ascending: false });
  return (data ?? []) as Activity[];
}

export async function logActivity(type: string, amount = 1, meta?: ActivityMeta): Promise<void> {
  if (!isSupabaseConfigured) {
    demo.activities.push({
      id: uid(), type, amount, occurred_at: new Date().toISOString(),
      notes: meta?.notes ?? "",
      client_name: meta?.client_name ?? null,
      job_id: meta?.job_id ?? null,
      job_label: meta?.job_label ?? null,
    });
    revalidateAll();
    return;
  }
  const row: Record<string, unknown> = { type, amount };
  if (meta?.client_name != null) row.client_name = meta.client_name;
  if (meta?.job_id != null) row.job_id = meta.job_id;
  if (meta?.job_label != null) row.job_label = meta.job_label;
  if (meta?.notes) row.notes = meta.notes;
  const sb = await createClient();
  await sb.from("activities").insert(row);
  revalidateAll();
}

/** Undo: remove the most recent event of this type on/after `sinceIso`. */
export async function undoActivity(type: string, sinceIso: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const idx = [...demo.activities].map((a, i) => ({ a, i }))
      .filter((x) => x.a.type === type && x.a.occurred_at >= sinceIso)
      .sort((p, q) => q.a.occurred_at.localeCompare(p.a.occurred_at))[0]?.i;
    if (idx != null) demo.activities.splice(idx, 1);
    revalidateAll();
    return;
  }
  const sb = await createClient();
  const { data } = await sb.from("activities").select("id").eq("type", type).gte("occurred_at", sinceIso).order("occurred_at", { ascending: false }).limit(1);
  const id = data?.[0]?.id;
  if (id) await sb.from("activities").delete().eq("id", id);
  revalidateAll();
}
