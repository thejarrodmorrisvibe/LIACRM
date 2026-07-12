"use client";

import { useMemo, useState, useTransition } from "react";
import type { Task, Candidate, Priority } from "@/lib/types";
import { PRIORITY_TONE } from "@/lib/types";
import { createTask, createTasksFromDump, toggleTask, deleteTask } from "@/lib/actions/tasks";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { Plus, Trash, CheckSquare, Calendar, Brain } from "@/components/icons";
import { cn, prettyDate } from "@/lib/utils";

type Filter = "today" | "overdue" | "open" | "done";
const TABS: { key: Filter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "overdue", label: "Overdue" },
  { key: "open", label: "All Open" },
  { key: "done", label: "Completed" },
];

const today = () => new Date().toISOString().slice(0, 10);

export function TasksClient({ tasks, candidates }: { tasks: Task[]; candidates: Candidate[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("open");

  const [mode, setMode] = useState<"single" | "dump">("single");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [due, setDue] = useState("");
  const [candId, setCandId] = useState("");
  const [dump, setDump] = useState("");

  const dumpLines = dump.split("\n").map((l) => l.trim()).filter(Boolean).length;

  const t = today();
  const nameOf = (id: string | null) => candidates.find((c) => c.id === id)?.name;

  const counts = useMemo(() => ({
    today: tasks.filter((x) => !x.done && x.due_date === t).length,
    overdue: tasks.filter((x) => !x.done && x.due_date && x.due_date < t).length,
    open: tasks.filter((x) => !x.done).length,
    done: tasks.filter((x) => x.done).length,
  }), [tasks, t]);

  const shown = tasks.filter((x) => {
    if (filter === "done") return x.done;
    if (filter === "open") return !x.done;
    if (filter === "today") return !x.done && x.due_date === t;
    if (filter === "overdue") return !x.done && x.due_date != null && x.due_date < t;
    return true;
  });

  function add() {
    if (!title.trim()) return;
    start(async () => {
      await createTask({ title, priority, due_date: due || null, candidate_id: candId || null });
      toast("Task added");
      setTitle(""); setDue(""); setCandId(""); setPriority("Medium");
    });
  }

  function addDump() {
    if (dumpLines === 0) return;
    start(async () => {
      const n = await createTasksFromDump(dump);
      toast(`Added ${n} ${n === 1 ? "task" : "tasks"} from your dump`);
      setDump("");
      setMode("single");
    });
  }

  function toggle(task: Task) {
    start(() => toggleTask(task.id, !task.done));
  }
  function remove(task: Task) {
    start(async () => { await deleteTask(task.id); toast("Task deleted", "info"); });
  }

  return (
    <PageShell>
      <PageHeader title="Tasks" subtitle="Add a task, or brain-dump your whole day and turn each line into a task." />

      {/* Composer with mode toggle */}
      <Card className="mt-6 overflow-hidden">
        <div className="flex gap-1 border-b border-line bg-surface-2/50 p-1.5">
          <ModeTab active={mode === "single"} onClick={() => setMode("single")} icon={<Plus width={15} height={15} />} label="Add task" />
          <ModeTab active={mode === "dump"} onClick={() => setMode("dump")} icon={<Brain width={15} height={15} />} label="Brain dump" />
        </div>

        {mode === "single" ? (
          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Add a task and press Enter…"
              className="flex-1"
            />
            <div className="flex gap-2">
              <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-[110px]">
                <option>Low</option><option>Medium</option><option>High</option>
              </Select>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-[150px]" />
              <Select value={candId} onChange={(e) => setCandId(e.target.value)} className="w-[150px]">
                <option value="">No candidate</option>
                {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Button onClick={add} disabled={pending}><Plus width={17} height={17} /> Add</Button>
            </div>
          </div>
        ) : (
          <div className="p-3">
            <Textarea
              value={dump}
              onChange={(e) => setDump(e.target.value)}
              rows={6}
              placeholder={"Empty your head, one thought per line:\nCall Lockheed PM about 2 more openings\nSend Lena the interview prep doc\nFollow up with Hannah on relo budget"}
            />
            <div className="mt-2.5 flex items-center justify-between">
              <p className="text-[12.5px] text-muted">
                Each line becomes its own task. {dumpLines > 0 && <span className="font-semibold text-ink">{dumpLines} ready</span>}
              </p>
              <Button onClick={addDump} disabled={pending || dumpLines === 0}>
                <Plus width={17} height={17} /> {pending ? "Adding…" : `Add ${dumpLines || ""} ${dumpLines === 1 ? "task" : "tasks"}`}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Filter tabs */}
      <div className="mt-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              filter === tab.key ? "bg-ink text-white" : "bg-surface text-ink-soft border border-line hover:bg-surface-2",
            )}
          >
            {tab.label}
            <span className={cn("rounded-full px-1.5 text-[11px]", filter === tab.key ? "bg-white/20" : "bg-surface-2 text-muted",
              tab.key === "overdue" && counts.overdue > 0 && filter !== tab.key && "bg-bad-soft text-bad")}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        {shown.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ok-soft text-ok">
              <CheckSquare width={22} height={22} />
            </span>
            <p className="mt-3 font-display font-bold text-ink">
              {filter === "done" ? "Nothing completed yet" : "All clear here"}
            </p>
            <p className="mt-1 text-[13.5px] text-muted">
              {filter === "today" ? "No tasks due today." : filter === "overdue" ? "Nothing overdue. Nice." : "Add a task above to get started."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((task) => {
              const overdue = !task.done && task.due_date && task.due_date < t;
              const cand = nameOf(task.candidate_id);
              return (
                <li key={task.id} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                  <button
                    onClick={() => toggle(task)}
                    aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border-2 transition-colors",
                      task.done ? "border-ok bg-ok text-white" : "border-line-strong hover:border-ok",
                    )}
                  >
                    {task.done && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-[14px] font-medium", task.done ? "text-faint line-through" : "text-ink")}>
                      {task.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px]">
                      {task.due_date && (
                        <span className={cn("inline-flex items-center gap-1", overdue ? "font-semibold text-bad" : "text-muted")}>
                          <Calendar width={12} height={12} /> {prettyDate(task.due_date)}
                        </span>
                      )}
                      {cand && <span className="text-accent">@ {cand}</span>}
                      {task.source === "braindump" && <Badge tone="info">brain dump</Badge>}
                    </div>
                  </div>
                  {!task.done && <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>}
                  <button onClick={() => remove(task)} className="grid h-8 w-8 place-items-center rounded-[8px] text-faint opacity-0 transition hover:bg-bad-soft hover:text-bad group-hover:opacity-100" aria-label="Delete">
                    <Trash width={15} height={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </PageShell>
  );
}

function ModeTab({
  active, onClick, icon, label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius-sm)] px-3.5 py-2 text-[13px] font-semibold transition-colors",
        active ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-muted hover:text-ink",
      )}
    >
      {icon} {label}
    </button>
  );
}
