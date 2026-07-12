"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demo, uid } from "@/lib/store/demo";
import { nthWorkingDay, REFERRAL_WORKING_DAYS } from "@/lib/referrals";
import type { Referral } from "@/lib/types";

/** Create the payroll heads-up task once a referral crosses this many working days. */
const REMINDER_AT_DAY = 25;

function reminderTitle(r: Pick<Referral, "referral_name" | "referrer_name" | "bonus_amount">): string {
  return `Notify payroll: pay $${r.bonus_amount || 250} referral bonus for ${r.referral_name} (referred by ${r.referrer_name})`;
}

export async function listReferrals(): Promise<Referral[]> {
  if (!isSupabaseConfigured) {
    return [...demo.referrals].sort((a, b) =>
      (b.referral_start_date ?? "").localeCompare(a.referral_start_date ?? ""),
    );
  }
  const sb = await createClient();
  const { data } = await sb
    .from("referrals")
    .select("*")
    .order("referral_start_date", { ascending: false, nullsFirst: false });
  return (data ?? []) as Referral[];
}

export async function createReferral(input: Partial<Referral>): Promise<void> {
  if (!isSupabaseConfigured) {
    demo.referrals.push({
      id: uid(),
      referrer_candidate_id: input.referrer_candidate_id ?? null,
      referrer_name: input.referrer_name?.trim() || "Unnamed referrer",
      referral_candidate_id: input.referral_candidate_id ?? null,
      referral_name: input.referral_name?.trim() || "Unnamed referral",
      referral_start_date: input.referral_start_date ?? null,
      bonus_amount: input.bonus_amount ?? 250,
      bonus_paid: input.bonus_paid ?? false,
      reminder_created: false,
      notes: input.notes ?? "",
      created_at: new Date().toISOString(),
    });
    revalidatePath("/referrals");
    return;
  }
  const sb = await createClient();
  await sb.from("referrals").insert(sanitize(input));
  revalidatePath("/referrals");
}

export async function updateReferral(id: string, patch: Partial<Referral>): Promise<void> {
  if (!isSupabaseConfigured) {
    const r = demo.referrals.find((x) => x.id === id);
    if (r) Object.assign(r, sanitize(patch));
    revalidatePath("/referrals");
    return;
  }
  const sb = await createClient();
  await sb.from("referrals").update(sanitize(patch)).eq("id", id);
  revalidatePath("/referrals");
}

export async function toggleReferralPaid(id: string, bonus_paid: boolean): Promise<void> {
  return updateReferral(id, { bonus_paid });
}

export async function deleteReferral(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    demo.referrals = demo.referrals.filter((r) => r.id !== id);
    revalidatePath("/referrals");
    return;
  }
  const sb = await createClient();
  await sb.from("referrals").delete().eq("id", id);
  revalidatePath("/referrals");
}

/**
 * Lazy "cron": when a referral reaches ~25 working days (and isn't paid yet),
 * create a High-priority payroll task and mark it so it's only created once.
 * Safe to call on every page load — it's idempotent via `reminder_created`.
 * Does NOT revalidate (so it can run during a server-component render).
 */
export async function ensureReferralReminders(): Promise<void> {
  const todayStr = new Date().toISOString().slice(0, 10);

  if (!isSupabaseConfigured) {
    for (const r of demo.referrals) {
      if (!r.referral_start_date || r.bonus_paid || r.reminder_created) continue;
      if (todayStr >= nthWorkingDay(r.referral_start_date, REMINDER_AT_DAY, false)) {
        demo.tasks.push({
          id: uid(), title: reminderTitle(r),
          due_date: nthWorkingDay(r.referral_start_date, REFERRAL_WORKING_DAYS, false),
          priority: "High", done: false, candidate_id: r.referral_candidate_id ?? null,
          source: "manual", created_at: new Date().toISOString(), completed_at: null,
        });
        r.reminder_created = true;
      }
    }
    return;
  }

  const sb = await createClient();
  const { data } = await sb
    .from("referrals")
    .select("*")
    .eq("reminder_created", false)
    .eq("bonus_paid", false)
    .not("referral_start_date", "is", null);

  for (const r of (data ?? []) as Referral[]) {
    if (todayStr < nthWorkingDay(r.referral_start_date as string, REMINDER_AT_DAY, false)) continue;

    // Atomically claim this referral: the WHERE reminder_created=false condition
    // means only ONE concurrent caller flips it and gets a row back. Others get
    // nothing and skip — so the payroll task is created exactly once.
    const { data: claimed } = await sb
      .from("referrals")
      .update({ reminder_created: true })
      .eq("id", r.id)
      .eq("reminder_created", false)
      .select("id");

    if (!claimed || claimed.length === 0) continue;

    await sb.from("tasks").insert({
      title: reminderTitle(r),
      due_date: nthWorkingDay(r.referral_start_date as string, REFERRAL_WORKING_DAYS, false),
      priority: "High",
      candidate_id: r.referral_candidate_id,
      source: "manual",
    });
  }
}

function sanitize(input: Partial<Referral>): Partial<Referral> {
  const allowed: (keyof Referral)[] = [
    "referrer_candidate_id", "referrer_name", "referral_candidate_id", "referral_name",
    "referral_start_date", "bonus_amount", "bonus_paid", "notes",
  ];
  const out: Record<string, unknown> = {};
  for (const k of allowed) if (k in input) out[k] = input[k];
  return out as Partial<Referral>;
}
