"use client";

import { useMemo, useState, useTransition } from "react";
import type { Activity, Submittal, Interview, Candidate, Job } from "@/lib/types";
import type { ActivityMeta } from "@/lib/actions/activities";
import type { WeekRow } from "@/lib/weekly-history";
import { ACTIVITIES, ACTIVITIES_DAILY, ACTIVITIES_WEEKLY, GOALS, isEngineeringRole, type ActivityMetric } from "@/lib/kpi";
import { startOfToday, startOfWeek, startOfMonth, sumSince, ymd } from "@/lib/activity-stats";
import { logActivity, undoActivity } from "@/lib/actions/activities";
import { WeeklyReportButton } from "@/components/activity/WeeklyReportButton";
import { LogOutreachButton } from "@/components/activity/LogOutreachButton";
import { WeeklyHistoryTable } from "@/components/activity/WeeklyHistoryTable";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { CheckSquare, Megaphone, Briefcase, Users } from "@/components/icons";
import { cn } from "@/lib/utils";

let tmp = 0;
const nowIso = () => new Date().toISOString();

export function ActivityClient({
  activities, outreach, submittals, interviews, candidates, jobs, weeklyHistory,
}: {
  activities: Activity[];
  outreach: Activity[];
  submittals: Submittal[];
  interviews: Interview[];
  candidates: Candidate[];
  jobs: Job[];
  weeklyHistory: WeekRow[];
}) {
  const [pending, start] = useTransition();
  // Outreach is tracked separately (all-time, tag-aware) so the breakdown below
  // stays in sync; every other metric lives in `events` (last ~45 days).
  const [events, setEvents] = useState<Activity[]>(() => activities.filter((a) => a.type !== "outreach"));
  const [outreachEvents, setOutreachEvents] = useState<Activity[]>(outreach);

  const todayMs = startOfToday().getTime();
  const weekMs = startOfWeek().getTime();
  const monthMs = startOfMonth().getTime();

  // date-string windows for CRM-derived metrics
  const todayStr = ymd(new Date());
  const weekStartStr = ymd(startOfWeek());
  const weekEndStr = ymd(new Date(startOfWeek().getTime() + 6 * 86_400_000));
  const monthPrefix = todayStr.slice(0, 7);

  const inWeek = (d: string | null) => !!d && d >= weekStartStr && d <= weekEndStr;
  const iDate = (iso: string | null) => (iso ? ymd(new Date(iso)) : null);

  // Derived KPI numbers
  const derived = useMemo(() => {
    const submissionsW = submittals.filter((s) => inWeek(s.submitted_at)).length;
    const engSubsW = submittals.filter((s) => inWeek(s.submitted_at) && isEngineeringRole(s.position)).length;
    const interviewsW = interviews.filter((i) => inWeek(iDate(i.scheduled_at))).length;
    const started = candidates.filter((c) => c.stage === "Started" && c.start_date);
    const hiresW = started.filter((c) => inWeek(c.start_date)).length;
    const hiresM = started.filter((c) => (c.start_date as string).startsWith(monthPrefix)).length;
    const engPlaceM = started.filter((c) => (c.start_date as string).startsWith(monthPrefix) && isEngineeringRole(c.role)).length;
    return { submissionsW, engSubsW, interviewsW, hiresW, hiresM, engPlaceM };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittals, interviews, candidates]);

  // Outreach events go in their own list (feeds the breakdown); everything else in `events`.
  const store = (type: string) => (type === "outreach" ? [outreachEvents, setOutreachEvents] as const : [events, setEvents] as const);

  function add(m: ActivityMetric) {
    const step = m.step ?? 1;
    // A click can log more than one activity type (e.g. a follow-up also counts as outreach).
    const types = [m.type, ...(m.alsoCounts ?? [])];
    for (const type of types) {
      const [, set] = store(type);
      set((e) => [...e, { id: `t${tmp++}`, type, amount: step, occurred_at: nowIso(), notes: "" }]);
    }
    start(async () => { await Promise.all(types.map((type) => logActivity(type, step))); });
  }
  function undo(m: ActivityMetric) {
    const sinceMs = m.cadence === "daily" ? todayMs : weekMs;
    const types = [m.type, ...(m.alsoCounts ?? [])];
    const undone: string[] = [];
    // Collect the specific event id to drop per store. Removing by id (not index)
    // in ONE update per store avoids index shifts when several types share `events`
    // (e.g. follow-up also logs re-engaged — both live in the same list).
    const drops = new Map<typeof setEvents, Set<string>>();
    for (const type of types) {
      const [list, set] = store(type);
      let target: Activity | null = null;
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].type === type && new Date(list[i].occurred_at).getTime() >= sinceMs) { target = list[i]; break; }
      }
      if (!target) continue;
      if (!drops.has(set)) drops.set(set, new Set());
      drops.get(set)!.add(target.id);
      undone.push(type);
    }
    if (undone.length === 0) return;
    for (const [set, ids] of drops) {
      set((e) => e.filter((ev) => !ids.has(ev.id)));
    }
    start(async () => { await Promise.all(undone.map((type) => undoActivity(type, new Date(sinceMs).toISOString()))); });
  }

  // Optimistically add a tagged outreach batch (from the Log Outreach modal).
  function addOutreachBatch(amount: number, meta: ActivityMeta) {
    setOutreachEvents((e) => [...e, {
      id: `t${tmp++}`, type: "outreach", amount, occurred_at: nowIso(), notes: meta.notes ?? "",
      client_name: meta.client_name ?? null, job_id: meta.job_id ?? null, job_label: meta.job_label ?? null,
    }]);
  }

  const DAY_MS = 86_400_000;
  const countFor = (m: ActivityMetric) => {
    // Bound to the current period so future-dated entries (e.g. tomorrow's
    // outreach logged ahead of time) don't leak into today's/this week's count.
    const [since, until] = m.cadence === "daily"
      ? [todayMs, todayMs + DAY_MS]
      : [weekMs, weekMs + 7 * DAY_MS];
    return sumSince(store(m.type)[0], m.type, since, until);
  };

  // Outreach breakdown — totals by client and by job, all from outreachEvents.
  const outreachAgg = useMemo(() => {
    let total = 0, week = 0, month = 0, tagged = 0;
    const clientMap = new Map<string, { name: string; total: number; week: number; month: number }>();
    const jobMap = new Map<string, { label: string; client: string | null; total: number; week: number }>();
    for (const a of outreachEvents) {
      const amt = a.amount || 0;
      const t = new Date(a.occurred_at).getTime();
      total += amt;
      if (t >= weekMs) week += amt;
      if (t >= monthMs) month += amt;
      if (a.client_name || a.job_id) tagged += amt;
      const ck = a.client_name ?? "__untagged__";
      const c = clientMap.get(ck) ?? { name: a.client_name ?? "Untagged", total: 0, week: 0, month: 0 };
      c.total += amt; if (t >= weekMs) c.week += amt; if (t >= monthMs) c.month += amt;
      clientMap.set(ck, c);
      if (a.job_id) {
        const j = jobMap.get(a.job_id) ?? { label: a.job_label ?? "Job opening", client: a.client_name ?? null, total: 0, week: 0 };
        j.total += amt; if (t >= weekMs) j.week += amt;
        jobMap.set(a.job_id, j);
      }
    }
    return {
      total, week, month, tagged,
      clients: [...clientMap.values()].sort((a, b) => b.total - a.total),
      jobRows: [...jobMap.values()].sort((a, b) => b.total - a.total),
    };
  }, [outreachEvents, weekMs, monthMs]);
  const reportEvents = useMemo(() => [...events, ...outreachEvents], [events, outreachEvents]);

  return (
    <PageShell>
      <PageHeader
        title="Activity"
        subtitle="Tap to tally your daily and weekly activity against your GAL KPI goals."
        action={
          <>
            <LogOutreachButton jobs={jobs} variant="secondary" onLogged={addOutreachBatch} />
            <WeeklyReportButton activities={reportEvents} submittals={submittals} interviews={interviews} candidates={candidates} />
          </>
        }
      />

      {/* Daily */}
      <SectionLabel title="Daily Goals" note="Resets each day" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIVITIES_DAILY.map((m) => (
          <Counter key={m.type} m={m} count={countFor(m)} pending={pending} onAdd={() => add(m)} onUndo={() => undo(m)} />
        ))}
      </div>

      {/* Weekly */}
      <SectionLabel title="Weekly Goals" note="Resets Monday" className="mt-7" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIVITIES_WEEKLY.map((m) => (
          <Counter key={m.type} m={m} count={countFor(m)} pending={pending} onAdd={() => add(m)} onUndo={() => undo(m)} />
        ))}
      </div>

      {/* Auto-tracked weekly KPIs */}
      <SectionLabel title="Weekly KPIs — Auto-tracked" note="Pulled from your CRM data" className="mt-7" />
      <Card className="divide-y divide-line">
        <KpiRow label="Submissions" value={derived.submissionsW} goal={GOALS.submissionsWeekly.goal} range={GOALS.submissionsWeekly.range} source="from Submittals" />
        <KpiRow label="Interviews / Phone Screens" value={derived.interviewsW} goal={GOALS.interviewsWeekly.goal} range={GOALS.interviewsWeekly.range} source="from Interviews" />
        <KpiRow label="Engineering Submissions" value={derived.engSubsW} goal={GOALS.engSubmissionsWeekly.goal} range={GOALS.engSubmissionsWeekly.range} source="engineering roles" />
        <KpiRow label="Hires" value={derived.hiresW} goal={GOALS.hiresWeekly.goal} range={GOALS.hiresWeekly.range} source="from Started" />
      </Card>

      {/* Monthly */}
      <SectionLabel title="Monthly Goals" note="Resets 1st of month" className="mt-7" />
      <Card className="divide-y divide-line">
        <KpiRow label="Hires (month)" value={derived.hiresM} goal={GOALS.hiresMonthly.goal} range={GOALS.hiresMonthly.range} source="from Started" />
        <KpiRow label="Engineering Placements" value={derived.engPlaceM} goal={GOALS.engPlacementsMonthly.goal} source="engineering Started" />
      </Card>

      {/* Outreach breakdown */}
      <div id="outreach" className="scroll-mt-24">
        <SectionLabel title="Outreach by Client & Job" note="Every outreach you log, totalled" className="mt-8" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Outreach" value={outreachAgg.total.toLocaleString()} accent="blue" icon={<Megaphone width={17} height={17} />} sub="all time" />
          <StatCard label="This Week" value={outreachAgg.week.toLocaleString()} accent="cyan" icon={<Megaphone width={17} height={17} />} sub="since Monday" />
          <StatCard label="This Month" value={outreachAgg.month.toLocaleString()} accent="emerald" icon={<Megaphone width={17} height={17} />} sub="month to date" />
          <StatCard label="Tagged" value={`${outreachAgg.total ? Math.round((outreachAgg.tagged / outreachAgg.total) * 100) : 0}%`} accent="violet" icon={<Users width={17} height={17} />} sub={`${outreachAgg.tagged.toLocaleString()} of ${outreachAgg.total.toLocaleString()}`} />
        </div>

        {outreachAgg.total === 0 ? (
          <Card className="mt-4 p-8 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-accent"><Megaphone width={20} height={20} /></span>
            <p className="mt-3 text-[13.5px] font-semibold text-ink">No outreach logged yet</p>
            <p className="mt-1 text-[12.5px] text-muted">Use the +1 button on Candidate Outreach above, or <strong>Log Outreach</strong> to record a batch and tag it to a job or client.</p>
          </Card>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
                <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-accent-soft text-accent"><Users width={15} height={15} /></span>
                <h3 className="font-display text-[14px] font-bold text-ink">By Client</h3>
              </div>
              <ul className="divide-y divide-line">
                {outreachAgg.clients.map((c) => (
                  <BreakdownRow key={c.name} label={c.name} total={c.total} note={`${c.week} this wk · ${c.month} this mo`}
                    pct={Math.max(4, (c.total / (outreachAgg.clients[0]?.total || 1)) * 100)}
                    color={c.name === "Untagged" ? "var(--color-line-strong)" : "var(--color-accent)"} muted={c.name === "Untagged"} />
                ))}
              </ul>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
                <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-info-soft text-info"><Briefcase width={15} height={15} /></span>
                <h3 className="font-display text-[14px] font-bold text-ink">By Job Opening</h3>
              </div>
              {outreachAgg.jobRows.length === 0 ? (
                <div className="px-5 py-8 text-center text-[12.5px] text-muted">No outreach tagged to a specific job yet. Pick a job when you log to see it here.</div>
              ) : (
                <ul className="divide-y divide-line">
                  {outreachAgg.jobRows.map((j, i) => (
                    <BreakdownRow key={i} label={j.label} sub={j.client} total={j.total} note={`${j.week} this wk`}
                      pct={Math.max(4, (j.total / (outreachAgg.jobRows[0]?.total || 1)) * 100)} color="var(--color-info)" />
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Weekly KPI history */}
      <div id="history" className="scroll-mt-24">
        <SectionLabel title="Weekly KPI History" note="Running record, resets never — Monday-start weeks" className="mt-8" />
        <WeeklyHistoryTable rows={weeklyHistory} />
      </div>
    </PageShell>
  );
}

function BreakdownRow({ label, sub, total, note, pct, color, muted }: {
  label: string; sub?: string | null; total: number; note: string; pct: number; color: string; muted?: boolean;
}) {
  return (
    <li className="px-5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn("min-w-0 truncate text-[13px] font-semibold", muted ? "text-faint italic" : "text-ink")}>
          {label}{sub && <span className="ml-1.5 text-[11.5px] font-medium text-muted">· {sub}</span>}
        </span>
        <span className="shrink-0 nums">
          <span className="font-display text-[14.5px] font-bold text-ink">{total.toLocaleString()}</span>
          <span className="ml-2 text-[11px] text-faint">{note}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </li>
  );
}

function SectionLabel({ title, note, className }: { title: string; note?: string; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-baseline gap-2", className)}>
      <h2 className="font-display text-[15px] font-bold text-ink">{title}</h2>
      {note && <span className="text-[12px] text-muted">{note}</span>}
    </div>
  );
}

function fmtCount(m: ActivityMetric, n: number): string {
  if (m.unit === "minutes") return `${(n / 60).toFixed(n % 60 === 0 ? 0 : 1)}h`;
  return String(n);
}

const shortLabel = (type: string) =>
  (ACTIVITIES.find((a) => a.type === type)?.label ?? type)
    .replace(/^Candidate\s+/, "")
    .replace(/^Previous Candidates\s+/, "");

function Counter({ m, count, pending, onAdd, onUndo }: { m: ActivityMetric; count: number; pending: boolean; onAdd: () => void; onUndo: () => void }) {
  const pct = Math.min(100, Math.round((count / m.goal) * 100));
  const met = count >= m.goal;
  const goalLabel = m.range ?? (m.unit === "minutes" ? `${m.goal / 60}h` : `${m.goal}`);
  const alsoNote = m.alsoCounts?.length ? `also +1 ${m.alsoCounts.map(shortLabel).join(" & ")}` : null;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13.5px] font-semibold text-ink">{m.label}</div>
          <div className="text-[11.5px] text-muted">Goal {goalLabel}{m.cadence === "daily" ? "/day" : "/wk"}</div>
        </div>
        {met && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ok-soft text-ok"><CheckSquare width={14} height={14} /></span>}
      </div>
      {alsoNote && (
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10.5px] font-semibold text-accent">
          {alsoNote}
        </div>
      )}
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className={cn("font-display text-[26px] font-extrabold leading-none nums", met ? "text-ok" : "text-ink")}>{fmtCount(m, count)}</span>
        <span className="text-[13px] text-faint">/ {m.unit === "minutes" ? `${m.goal / 60}h` : m.goal}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: met ? "var(--color-ok)" : m.accent }} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={onUndo} disabled={pending || count <= 0} aria-label="Undo one"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-line-strong text-ink-soft transition hover:bg-surface-2 disabled:opacity-40">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
        </button>
        <button onClick={onAdd} disabled={pending}
          className="brand-gradient inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] text-[14px] font-bold text-white transition hover:brightness-110">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          {m.step && m.step > 1 ? `${m.step}m` : "1"}
        </button>
      </div>
    </Card>
  );
}

function KpiRow({ label, value, goal, range, source }: { label: string; value: number; goal: number; range?: string; source?: string }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  const met = value >= goal;
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="w-[190px] shrink-0">
        <div className="text-[13.5px] font-semibold text-ink">{label}</div>
        {source && <div className="text-[11.5px] text-faint">{source}</div>}
      </div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: met ? "var(--color-ok)" : "var(--color-accent)" }} />
      </div>
      <div className={cn("w-16 shrink-0 text-right font-display text-[15px] font-bold nums", met ? "text-ok" : "text-ink")}>
        {value}/{goal}
      </div>
    </div>
  );
}

