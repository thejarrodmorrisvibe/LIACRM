"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demo, uid } from "@/lib/store/demo";
import type { Interview } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/interviews");
  revalidatePath("/dashboard");
}

export async function listInterviews(): Promise<Interview[]> {
  if (!isSupabaseConfigured) {
    return [...demo.interviews].sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  }
  const sb = await createClient();
  const { data } = await sb.from("interviews").select("*").order("scheduled_at", { ascending: true, nullsFirst: false });
  return (data ?? []) as Interview[];
}

export async function createInterview(input: Partial<Interview>): Promise<void> {
  if (!isSupabaseConfigured) {
    demo.interviews.push({
      id: uid(),
      candidate_id: input.candidate_id ?? null,
      candidate_name: input.candidate_name?.trim() || "Unnamed candidate",
      client_name: input.client_name ?? null,
      position: input.position ?? null,
      interview_type: input.interview_type ?? "Phone",
      scheduled_at: input.scheduled_at ?? null,
      location: input.location ?? null,
      status: input.status ?? "Scheduled",
      notes: input.notes ?? "",
      created_at: new Date().toISOString(),
    });
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb.from("interviews").insert(sanitize(input));
  revalidateAll();
}

export async function updateInterview(id: string, patch: Partial<Interview>): Promise<void> {
  if (!isSupabaseConfigured) {
    const r = demo.interviews.find((x) => x.id === id);
    if (r) Object.assign(r, sanitize(patch));
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb.from("interviews").update(sanitize(patch)).eq("id", id);
  revalidateAll();
}

export async function deleteInterview(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    demo.interviews = demo.interviews.filter((r) => r.id !== id);
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb.from("interviews").delete().eq("id", id);
  revalidateAll();
}

function sanitize(input: Partial<Interview>): Partial<Interview> {
  const allowed: (keyof Interview)[] = [
    "candidate_id", "candidate_name", "client_name", "position",
    "interview_type", "scheduled_at", "location", "status", "notes",
  ];
  const out: Record<string, unknown> = {};
  for (const k of allowed) if (k in input) out[k] = input[k];
  return out as Partial<Interview>;
}
