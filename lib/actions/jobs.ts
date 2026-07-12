"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demo, uid } from "@/lib/store/demo";
import type { Job } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/jobs");
  revalidatePath("/pipeline");
  revalidatePath("/roster");
}

export async function listJobs(): Promise<Job[]> {
  if (!isSupabaseConfigured) {
    return [...demo.jobs].sort(
      (a, b) => Number(b.is_hot) - Number(a.is_hot) || a.client_name.localeCompare(b.client_name),
    );
  }
  const sb = await createClient();
  const { data } = await sb
    .from("jobs")
    .select("*")
    .order("is_hot", { ascending: false })
    .order("client_name");
  return (data ?? []) as Job[];
}

export async function createJob(input: Partial<Job>): Promise<void> {
  if (!isSupabaseConfigured) {
    const now = new Date().toISOString();
    demo.jobs.push({
      id: uid(),
      client_name: input.client_name?.trim() || "New client",
      position_title: input.position_title?.trim() || "New position",
      pay_type: input.pay_type ?? "hourly",
      pay_amount: input.pay_amount ?? null,
      pay_min: input.pay_min ?? null,
      pay_max: input.pay_max ?? null,
      location: input.location ?? null,
      job_type: input.job_type ?? null,
      status: input.status ?? "Open",
      is_hot: input.is_hot ?? false,
      description: input.description ?? null,
      requirements: input.requirements ?? null,
      client_note: input.client_note ?? null,
      notes: input.notes ?? "",
      created_at: now,
      updated_at: now,
    });
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb.from("jobs").insert(sanitize(input));
  revalidateAll();
}

export async function updateJob(id: string, patch: Partial<Job>): Promise<void> {
  if (!isSupabaseConfigured) {
    const j = demo.jobs.find((x) => x.id === id);
    if (j) Object.assign(j, sanitize(patch), { updated_at: new Date().toISOString() });
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb
    .from("jobs")
    .update({ ...sanitize(patch), updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidateAll();
}

export async function toggleHot(id: string, is_hot: boolean): Promise<void> {
  return updateJob(id, { is_hot });
}

export async function deleteJob(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    demo.jobs = demo.jobs.filter((j) => j.id !== id);
    demo.candidates.forEach((c) => {
      if (c.job_id === id) c.job_id = null;
    });
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb.from("jobs").delete().eq("id", id);
  revalidateAll();
}

function sanitize(input: Partial<Job>): Partial<Job> {
  const allowed: (keyof Job)[] = [
    "client_name", "position_title", "pay_type", "pay_amount", "pay_min", "pay_max",
    "location", "job_type", "status", "is_hot", "description", "requirements", "client_note", "notes",
  ];
  const out: Record<string, unknown> = {};
  for (const k of allowed) if (k in input) out[k] = input[k];
  return out as Partial<Job>;
}
