"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demo, uid } from "@/lib/store/demo";
import { createTask } from "./tasks";
import type { BrainDump } from "@/lib/types";

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export async function listBrainDumps(): Promise<BrainDump[]> {
  if (!isSupabaseConfigured) {
    return [...demo.braindumps].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  }
  const sb = await createClient();
  const { data } = await sb.from("braindumps").select("*").order("entry_date", { ascending: false });
  return (data ?? []) as BrainDump[];
}

/** Save (or replace) today's brain dump entry. */
export async function saveBrainDump(rawText: string): Promise<void> {
  const entry_date = todayYmd();
  if (!isSupabaseConfigured) {
    const existing = demo.braindumps.find((b) => b.entry_date === entry_date);
    if (existing) existing.raw_text = rawText;
    else
      demo.braindumps.push({
        id: uid(),
        entry_date,
        raw_text: rawText,
        created_at: new Date().toISOString(),
      });
    revalidatePath("/braindump");
    return;
  }
  const sb = await createClient();
  const { data: existing } = await sb
    .from("braindumps")
    .select("id")
    .eq("entry_date", entry_date)
    .maybeSingle();
  if (existing) {
    await sb.from("braindumps").update({ raw_text: rawText }).eq("id", existing.id);
  } else {
    await sb.from("braindumps").insert({ entry_date, raw_text: rawText });
  }
  revalidatePath("/braindump");
}

/** Promote a single brain-dump line into a task. */
export async function promoteLineToTask(text: string, candidateId?: string | null): Promise<void> {
  const title = text.trim();
  if (!title) return;
  await createTask({ title, candidate_id: candidateId ?? null, source: "braindump", priority: "Medium" });
  revalidatePath("/braindump");
  revalidatePath("/tasks");
}
