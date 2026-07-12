"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { demo, uid } from "@/lib/store/demo";
import type { Task } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/tasks");
  revalidatePath("/braindump");
  revalidatePath("/pipeline");
}

export async function listTasks(): Promise<Task[]> {
  if (!isSupabaseConfigured) {
    return [...demo.tasks].sort(sortTasks);
  }
  const sb = await createClient();
  const { data } = await sb
    .from("tasks")
    .select("*")
    .order("done")
    .order("due_date", { nullsFirst: false });
  return (data ?? []) as Task[];
}

function sortTasks(a: Task, b: Task) {
  if (a.done !== b.done) return Number(a.done) - Number(b.done);
  if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
  if (a.due_date) return -1;
  if (b.due_date) return 1;
  return 0;
}

export async function createTask(input: Partial<Task>): Promise<void> {
  if (!isSupabaseConfigured) {
    demo.tasks.push({
      id: uid(),
      title: input.title?.trim() || "Untitled task",
      due_date: input.due_date ?? null,
      priority: input.priority ?? "Medium",
      done: false,
      candidate_id: input.candidate_id ?? null,
      source: input.source ?? "manual",
      created_at: new Date().toISOString(),
      completed_at: null,
    });
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb.from("tasks").insert(sanitize(input));
  revalidateAll();
}

/** Brain dump: turn each non-empty line of text into its own task. */
export async function createTasksFromDump(text: string): Promise<number> {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return 0;
  if (!isSupabaseConfigured) {
    const now = new Date().toISOString();
    for (const title of lines) {
      demo.tasks.push({
        id: uid(), title, due_date: null, priority: "Medium", done: false,
        candidate_id: null, source: "braindump", created_at: now, completed_at: null,
      });
    }
    revalidateAll();
    return lines.length;
  }
  const sb = await createClient();
  await sb.from("tasks").insert(lines.map((title) => ({ title, priority: "Medium", source: "braindump" })));
  revalidateAll();
  return lines.length;
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  const completed_at = done ? new Date().toISOString() : null;
  if (!isSupabaseConfigured) {
    const t = demo.tasks.find((x) => x.id === id);
    if (t) Object.assign(t, { done, completed_at });
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb.from("tasks").update({ done, completed_at }).eq("id", id);
  revalidateAll();
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<void> {
  if (!isSupabaseConfigured) {
    const t = demo.tasks.find((x) => x.id === id);
    if (t) Object.assign(t, sanitize(patch));
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb.from("tasks").update(sanitize(patch)).eq("id", id);
  revalidateAll();
}

export async function deleteTask(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    demo.tasks = demo.tasks.filter((t) => t.id !== id);
    revalidateAll();
    return;
  }
  const sb = await createClient();
  await sb.from("tasks").delete().eq("id", id);
  revalidateAll();
}

function sanitize(input: Partial<Task>): Partial<Task> {
  const allowed: (keyof Task)[] = [
    "title", "due_date", "priority", "done", "candidate_id", "source", "completed_at",
  ];
  const out: Record<string, unknown> = {};
  for (const k of allowed) if (k in input) out[k] = input[k];
  return out as Partial<Task>;
}
