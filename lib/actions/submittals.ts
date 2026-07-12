"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demo, uid } from "@/lib/store/demo";
import type { Submittal, Stage } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/submittals");
  revalidatePath("/roster");
}

/** Pull the first number out of a pay-rate string ("$40/HR", "58 - 60") -> 40 / 58. */
function parsePayRate(v: string | null): number | null {
  if (!v) return null;
  const m = v.match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/**
 * Assign a pipeline stage from the Submittals tab. Finds (or creates) the
 * candidate behind this submittal, sets their stage, and links the submittal to
 * them — so it shows on the Pipeline board. Writes the candidate stage directly
 * (does NOT go through createCandidate/updateCandidate) so it never fires the
 * "entered Submitted -> auto-log a submittal" side effect and duplicates rows.
 */
export async function setSubmittalStage(submittalId: string, stage: Stage): Promise<void> {
  const nowIso = new Date().toISOString();

  if (!isSupabaseConfigured) {
    const sub = demo.submittals.find((s) => s.id === submittalId);
    if (!sub) return;
    let cand = sub.candidate_id ? demo.candidates.find((c) => c.id === sub.candidate_id) : undefined;
    if (!cand) cand = demo.candidates.find((c) => c.name.trim().toLowerCase() === sub.candidate_name.trim().toLowerCase());
    if (cand) {
      cand.stage = stage; cand.updated_at = nowIso;
    } else {
      cand = {
        id: uid(), name: sub.candidate_name, email: null, phone: null,
        role: sub.position, client_company: sub.client_name, pay_rate: parsePayRate(sub.pay_rate),
        stage, drug_tested: false, background_cleared: false, offer_accepted: false,
        start_date: null, end_date: null, job_id: null, notes: "",
        created_at: nowIso, updated_at: nowIso,
      };
      demo.candidates.push(cand);
    }
    sub.candidate_id = cand.id;
    revalidateStage();
    return;
  }

  const sb = await createClient();
  const { data: sub } = await sb.from("submittals").select("*").eq("id", submittalId).single();
  if (!sub) return;

  let candidateId: string | null = null;
  if (sub.candidate_id) {
    const { data } = await sb.from("candidates").select("id").eq("id", sub.candidate_id).maybeSingle();
    candidateId = data?.id ?? null;
  }
  if (!candidateId) {
    const { data } = await sb.from("candidates").select("id").ilike("name", sub.candidate_name).limit(1);
    candidateId = data?.[0]?.id ?? null;
  }

  if (candidateId) {
    await sb.from("candidates").update({ stage, updated_at: nowIso }).eq("id", candidateId);
  } else {
    const { data: created } = await sb.from("candidates").insert({
      name: sub.candidate_name, client_company: sub.client_name, role: sub.position,
      pay_rate: parsePayRate(sub.pay_rate), stage,
    }).select("id").single();
    candidateId = created?.id ?? null;
  }

  if (candidateId && candidateId !== sub.candidate_id) {
    await sb.from("submittals").update({ candidate_id: candidateId }).eq("id", submittalId);
  }
  revalidateStage();
}

function revalidateStage() {
  for (const p of ["/submittals", "/pipeline", "/roster", "/commissions", "/dashboard"]) revalidatePath(p);
}

export async function listSubmittals(): Promise<Submittal[]> {
  if (!isSupabaseConfigured) {
    return [...demo.submittals].sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
  }
  const sb = await createClient();
  const { data } = await sb
    .from("submittals")
    .select("*")
    .order("submitted_at", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as Submittal[];
}

export async function createSubmittal(input: Partial<Submittal>): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  if (!isSupabaseConfigured) {
    demo.submittals.push({
      id: uid(),
      candidate_id: input.candidate_id ?? null,
      candidate_name: input.candidate_name?.trim() || "Unnamed candidate",
      client_name: input.client_name ?? null,
      position: input.position ?? null,
      pay_rate: input.pay_rate ?? null,
      location: input.location ?? null,
      submitted_at: input.submitted_at || today,
      notes: input.notes ?? "",
      created_at: new Date().toISOString(),
    });
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb.from("submittals").insert({
    candidate_id: input.candidate_id ?? null,
    candidate_name: input.candidate_name?.trim() || "Unnamed candidate",
    client_name: input.client_name ?? null,
    position: input.position ?? null,
    pay_rate: input.pay_rate ?? null,
    location: input.location ?? null,
    submitted_at: input.submitted_at || today,
    notes: input.notes ?? "",
  });
  revalidateAll();
}

export async function deleteSubmittal(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    demo.submittals = demo.submittals.filter((s) => s.id !== id);
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb.from("submittals").delete().eq("id", id);
  revalidateAll();
}
