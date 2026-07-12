"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demo, uid } from "@/lib/store/demo";
import { createSubmittal } from "./submittals";
import type { Candidate } from "@/lib/types";

const PATHS = ["/pipeline", "/roster", "/commissions", "/jobs", "/tasks", "/submittals"];
function revalidateAll() {
  for (const p of PATHS) revalidatePath(p);
}

/** Log a submittal snapshot from a candidate (used when they enter Submitted). */
async function autoLogSubmittal(c: {
  id?: string | null;
  name?: string | null;
  client_company?: string | null;
  role?: string | null;
  pay_rate?: number | null;
}) {
  await createSubmittal({
    candidate_id: c.id ?? null,
    candidate_name: c.name ?? "Unnamed candidate",
    client_name: c.client_company ?? null,
    position: c.role ?? null,
    pay_rate: c.pay_rate != null ? String(c.pay_rate) : null,
  });
}

export async function listCandidates(): Promise<Candidate[]> {
  if (!isSupabaseConfigured) {
    return [...demo.candidates].sort((a, b) => a.name.localeCompare(b.name));
  }
  const sb = await createClient();
  const { data } = await sb.from("candidates").select("*").order("name");
  return (data ?? []) as Candidate[];
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  if (!isSupabaseConfigured) {
    return demo.candidates.find((c) => c.id === id) ?? null;
  }
  const sb = await createClient();
  const { data } = await sb.from("candidates").select("*").eq("id", id).single();
  return (data as Candidate) ?? null;
}

export async function listCandidatesForJob(jobId: string): Promise<Candidate[]> {
  if (!isSupabaseConfigured) {
    return demo.candidates.filter((c) => c.job_id === jobId);
  }
  const sb = await createClient();
  const { data } = await sb.from("candidates").select("*").eq("job_id", jobId).order("name");
  return (data ?? []) as Candidate[];
}

export async function createCandidate(input: Partial<Candidate>): Promise<void> {
  if (!isSupabaseConfigured) {
    const now = new Date().toISOString();
    const created: Candidate = {
      id: uid(),
      name: input.name?.trim() || "Untitled candidate",
      email: input.email ?? null,
      phone: input.phone ?? null,
      role: input.role ?? null,
      client_company: input.client_company ?? null,
      pay_rate: input.pay_rate ?? null,
      stage: input.stage ?? "New",
      drug_tested: input.drug_tested ?? false,
      background_cleared: input.background_cleared ?? false,
      offer_accepted: input.offer_accepted ?? false,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      job_id: input.job_id ?? null,
      notes: input.notes ?? "",
      created_at: now,
      updated_at: now,
    };
    demo.candidates.push(created);
    if (created.stage === "Submitted") await autoLogSubmittal(created);
    revalidateAll();
    return;
  }
  const sb = await createClient();
  const { data: created } = await sb
    .from("candidates")
    .insert(sanitize(input))
    .select("id, name, client_company, role, pay_rate, stage")
    .single();
  if (created?.stage === "Submitted") await autoLogSubmittal(created);
  revalidateAll();
}

export async function updateCandidate(id: string, patch: Partial<Candidate>): Promise<void> {
  const enteringSubmitted = patch.stage === "Submitted";
  if (!isSupabaseConfigured) {
    const c = demo.candidates.find((x) => x.id === id);
    const wasSubmitted = c?.stage === "Submitted";
    if (c) Object.assign(c, sanitize(patch), { updated_at: new Date().toISOString() });
    if (c && enteringSubmitted && !wasSubmitted) await autoLogSubmittal(c);
    revalidateAll();
    return;
  }
  const sb = await createClient();
  let wasSubmitted = false;
  if (enteringSubmitted) {
    const { data: prev } = await sb.from("candidates").select("stage").eq("id", id).single();
    wasSubmitted = prev?.stage === "Submitted";
  }
  await sb
    .from("candidates")
    .update({ ...sanitize(patch), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (enteringSubmitted && !wasSubmitted) {
    const { data: row } = await sb
      .from("candidates")
      .select("id, name, client_company, role, pay_rate")
      .eq("id", id)
      .single();
    if (row) await autoLogSubmittal(row);
  }
  revalidateAll();
}

export async function deleteCandidate(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    demo.candidates = demo.candidates.filter((c) => c.id !== id);
    demo.tasks.forEach((t) => {
      if (t.candidate_id === id) t.candidate_id = null;
    });
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb.from("candidates").delete().eq("id", id);
  revalidateAll();
}

/** Whitelist editable columns (never let id/owner/timestamps be overwritten). */
function sanitize(input: Partial<Candidate>): Partial<Candidate> {
  const allowed: (keyof Candidate)[] = [
    "name", "email", "phone", "role", "client_company", "pay_rate", "stage",
    "drug_tested", "background_cleared", "offer_accepted", "start_date",
    "end_date", "job_id", "notes",
  ];
  const out: Record<string, unknown> = {};
  for (const k of allowed) if (k in input) out[k] = input[k];
  return out as Partial<Candidate>;
}
