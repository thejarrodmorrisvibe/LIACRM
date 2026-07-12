import Link from "next/link";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Send, CheckSquare, Calendar, Users, ArrowUpRight, Sparkles, Dollar, Book, Award } from "@/components/icons";
import { verseForDay, TRANSLATION, ATTRIBUTION } from "@/lib/verses";
import { PomodoroTimer } from "@/components/dashboard/PomodoroTimer";
import { WeeklyReportButton } from "@/components/activity/WeeklyReportButton";
import { listCandidates } from "@/lib/actions/candidates";
import { listTasks } from "@/lib/actions/tasks";
import { listSubmittals } from "@/lib/actions/submittals";
import { listInterviews } from "@/lib/actions/interviews";
import { listActivities, listAllActivities } from "@/lib/actions/activities";
import { ensureReferralReminders } from "@/lib/actions/referrals";
import { buildWeeklyHistory } from "@/lib/weekly-history";
import { WeeklyHistoryTable } from "@/components/activity/WeeklyHistoryTable";
import { weekStartYmd } from "@/lib/submittals";
import { GOALS } from "@/lib/kpi";
import { isActivelyWorking, accruesCommission, PRIORITY_TONE, type Candidate } from "@/lib/types";
import type { Tone } from "@/components/ui/Badge";
import {
  currentQuarterAccrued, projectedCurrentQuarter, totalToDate, WEEKLY_RATE, quarterOf,
} from "@/lib/commission";
import { prettyDate, usd } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

function daysUntil(dateStr: string, todayStr: string): number {
  return Math.round((new Date(dateStr + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86_400_000);
}
function untilLabel(n: number): string {
  if (n <= 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `in ${n} days`;
}
const initials = (s: string) => s.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

/* ---------- Highlights: recent wins & milestones ---------- */
type HighlightKind = "offer-extended" | "offer-accepted" | "new-hire";
interface Highlight {
  id: string; name: string; client: string | null; kind: HighlightKind; when: string; sub?: string;
}
const HIGHLIGHT_META: Record<HighlightKind, { label: string; tone: Tone; avatar: string }> = {
  "offer-extended": { label: "Offer extended", tone: "info", avatar: "bg-info-soft text-info" },
  "offer-accepted": { label: "Offer accepted", tone: "accent", avatar: "bg-accent-soft text-accent" },
  "new-hire": { label: "New hire", tone: "ok", avatar: "bg-ok-soft text-ok" },
};

function buildHighlights(candidates: Candidate[], todayStr: string): Highlight[] {
  const items: Highlight[] = [];
  for (const c of candidates) {
    if (c.stage === "Offer Extended") {
      items.push({ id: c.id, name: c.name, client: c.client_company, kind: "offer-extended", when: c.updated_at });
    } else if (c.stage === "Offer Accepted") {
      items.push({ id: c.id, name: c.name, client: c.client_company, kind: "offer-accepted", when: c.updated_at });
    } else if (c.stage === "Started" && c.start_date && c.start_date <= todayStr) {
      if (daysUntil(c.start_date, todayStr) >= -21) {
        items.push({ id: c.id, name: c.name, client: c.client_company, kind: "new-hire", when: c.start_date, sub: `started ${prettyDate(c.start_date)}` });
      }
    }
  }
  return items.sort((a, b) => (b.when || "").localeCompare(a.when || "")).slice(0, 6);
}

export default async function DashboardPage() {
  await ensureReferralReminders();
  const [candidates, tasks, submittals, interviews, activities, allActivities] = await Promise.all([
    listCandidates(), listTasks(), listSubmittals(), listInterviews(), listActivities(), listAllActivities(),
  ]);

  const now = new Date();
  const todayStr = ymd(now);
  const weekStart = weekStartYmd(now);
  const monthPrefix = todayStr.slice(0, 7);
  const in28 = new Date(now); in28.setDate(in28.getDate() + 28);
  const in28Str = ymd(in28);

  // Hires this month = candidates who started this calendar month.
  const hiresMonth = candidates.filter(
    (c) => c.stage === "Started" && c.start_date && c.start_date.startsWith(monthPrefix),
  ).length;

  const weekSubs = submittals
    .filter((s) => s.submitted_at >= weekStart && s.submitted_at <= todayStr)
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));

  const pending = tasks.filter((t) => !t.done)
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));

  // Anyone you've put in "Tracking" (or Started) with a start date in the next
  // 4 weeks shows here automatically, counting down to their start.
  const upcoming = candidates
    .filter(
      (c) =>
        c.start_date &&
        c.start_date >= todayStr &&
        c.start_date <= in28Str &&
        (c.stage === "Tracking" || c.stage === "Started"),
    )
    .sort((a, b) => (a.start_date as string).localeCompare(b.start_date as string));

  const highlights = buildHighlights(candidates, todayStr);

  const workingNow = candidates.filter((c) => isActivelyWorking(c, now)).length;
  const nameOf = (id: string | null) => candidates.find((c) => c.id === id)?.name;

  // Commission snapshot
  const spans = candidates.filter(accruesCommission).map((c) => ({ start: c.start_date as string, end: c.end_date }));
  const qAccrued = currentQuarterAccrued(spans, now);
  const qProjected = projectedCurrentQuarter(spans, now);
  const allTime = totalToDate(spans, now);
  const perWeek = workingNow * WEEKLY_RATE;
  const qLabel = quarterOf(now).replace("-", " ");

  // Weekly KPI history (running record) — show the most recent 5 weeks here.
  const weeklyHistory = buildWeeklyHistory(allActivities, submittals, candidates, now).slice(0, 5);

  // Recruiting funnel — driven by real activity (submittals + interviews),
  // then live pipeline stages for offers and starts. Reflects current stats.
  const funnel = [
    { stage: "Submitted", n: submittals.length, color: "#2f6bff" },
    { stage: "Interviewing", n: interviews.length, color: "#6366f1" },
    { stage: "Offers", n: candidates.filter((c) => c.stage === "Offer Extended" || c.stage === "Offer Accepted").length, color: "#8b5cf6" },
    { stage: "Started", n: candidates.filter((c) => c.stage === "Started").length, color: "#11b886" },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.n));

  const verse = verseForDay(now);

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        subtitle="Your week at a glance. Submittals, what's pending, who's starting, and what needs a nudge."
        action={<WeeklyReportButton activities={activities} submittals={submittals} interviews={interviews} candidates={candidates} />}
      />

      {/* Verse of the day */}
      <div className="mt-5 relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-gradient-to-r from-accent-soft/50 to-surface p-5 shadow-[var(--shadow-card)]">
        <span className="brand-gradient absolute inset-y-0 left-0 w-1" />
        <div className="flex items-start gap-3 pl-1.5">
          <span className="brand-gradient mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-white">
            <Book width={16} height={16} />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Verse of the Day</div>
            <p className="mt-1.5 font-display text-[16.5px] font-medium italic leading-relaxed text-ink">
              &ldquo;{verse.text}&rdquo;
            </p>
            <p className="mt-1.5 text-[13px] font-bold brand-text">{verse.reference} <span className="font-medium text-faint">· {TRANSLATION}</span></p>
            <p className="mt-2 text-[10px] leading-snug text-faint">{ATTRIBUTION}</p>
          </div>
        </div>
      </div>

      {/* Operational KPIs (clickable) */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Submittals This Week" accent="blue" icon={<Send width={17} height={17} />}
          value={<>{weekSubs.length}<span className="text-[17px] font-bold text-faint">/{GOALS.submissionsWeekly.goal}</span></>}
          sub={weekSubs.length >= GOALS.submissionsWeekly.goal ? "weekly goal met ✓ →" : "weekly submission goal →"}
          href="/submittals?period=week" />
        <StatCard label="Hires This Month" accent="violet" icon={<Award width={17} height={17} />}
          value={<>{hiresMonth}<span className="text-[17px] font-bold text-faint">/{GOALS.hiresMonthly.goal}</span></>}
          sub={hiresMonth >= GOALS.hiresMonthly.goal ? "monthly goal met ✓ →" : "monthly hire goal →"}
          href="/activity" />
        <StatCard label="Pending Tasks" value={pending.length} accent="amber" icon={<CheckSquare width={17} height={17} />} sub="open the list →" href="/tasks" />
        <StatCard label="Upcoming Starts" value={upcoming.length} accent="cyan" icon={<Calendar width={17} height={17} />} sub="next 4 weeks →" href="#upcoming" />
        <StatCard label="Working Now" value={workingNow} accent="emerald" icon={<Users width={17} height={17} />} sub="open the roster →" href="/roster" />
      </div>

      {/* Pomodoro focus timer */}
      <PomodoroTimer />

      {/* Commission snapshot */}
      <Card className="mt-5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ok-soft text-ok"><Dollar width={17} height={17} /></span>
            <h3 className="font-display text-[15px] font-bold text-ink">Commission Snapshot</h3>
          </div>
          <Link href="/commissions" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline">
            Details <ArrowUpRight width={13} height={13} />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Money label={`${qLabel} so far`} value={usd(qAccrued)} tone="text-accent" />
          <Money label="Projected this quarter" value={usd(qProjected)} tone="text-accent-2" />
          <Money label="All-time to date" value={usd(allTime)} tone="text-ok" />
          <Money label="Weekly run-rate" value={usd(perWeek)} tone="text-ink" />
        </div>
      </Card>

      {/* Upcoming + Pending */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card id="upcoming" className="scroll-mt-24 overflow-hidden">
          <SectionHead title="Upcoming Starts" note="Next 4 weeks" href="/roster" />
          {upcoming.length === 0 ? (
            <Empty icon={<Calendar width={20} height={20} />} text="No candidates starting in the next four weeks." />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((c) => {
                const n = daysUntil(c.start_date as string, todayStr);
                return (
                  <li key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                    <Avatar text={initials(c.name)} tone="ok" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-semibold text-ink">{c.name}</div>
                      <div className="truncate text-[12.5px] text-muted">{[c.role, c.client_company].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[13px] font-semibold text-ink nums">{prettyDate(c.start_date)}</div>
                      <Badge tone={n <= 3 ? "warn" : "ok"}>{untilLabel(n)}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <SectionHead title="Pending Tasks" note={`${pending.length} open`} href="/tasks" />
          {pending.length === 0 ? (
            <Empty icon={<CheckSquare width={20} height={20} />} text="All caught up — no open tasks." />
          ) : (
            <ul className="divide-y divide-line">
              {pending.slice(0, 6).map((t) => {
                const overdue = t.due_date && t.due_date < todayStr;
                const cand = nameOf(t.candidate_id);
                return (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: overdue ? "var(--color-bad)" : "var(--color-line-strong)" }} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium text-ink">{t.title}</div>
                      <div className="flex items-center gap-2 text-[12px]">
                        {t.due_date && <span className={overdue ? "font-semibold text-bad" : "text-muted"}>{prettyDate(t.due_date)}</span>}
                        {cand && <span className="text-accent">@ {cand}</span>}
                      </div>
                    </div>
                    <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                  </li>
                );
              })}
              {pending.length > 6 && <MoreRow n={pending.length - 6} where="Tasks" />}
            </ul>
          )}
        </Card>
      </div>

      {/* Funnel + Follow-ups */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <SectionHead title="Recruiting Funnel" note="View board" href="/pipeline" />
          <div className="space-y-2.5 px-5 py-4">
            {funnel.map((f) => (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="w-[92px] shrink-0 truncate text-[12.5px] font-medium text-ink-soft">{f.stage}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${Math.max(f.n ? 8 : 0, (f.n / funnelMax) * 100)}%`, background: f.color }} />
                </div>
                <span className="w-8 shrink-0 text-right text-[13px] font-bold text-ink nums">{f.n}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <SectionHead title="Highlights" note="Recent wins" href="/pipeline" />
          {highlights.length === 0 ? (
            <Empty icon={<Sparkles width={20} height={20} />} text="No recent highlights yet. Offers and new hires will show up here." />
          ) : (
            <ul className="divide-y divide-line">
              {highlights.map((h) => {
                const m = HIGHLIGHT_META[h.kind];
                return (
                  <li key={h.id + h.kind} className="flex items-center gap-3 px-5 py-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold ${m.avatar}`}>
                      {initials(h.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-ink">{h.name}</div>
                      <div className="truncate text-[12px] text-muted">
                        {[h.client, h.sub].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <Badge tone={m.tone} dot>{m.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* This Week's Submittals */}
      <Card className="mt-5 overflow-hidden">
        <SectionHead title="This Week's Submittals" note={`${weekSubs.length} this week`} href="/submittals" />
        {weekSubs.length === 0 ? (
          <Empty icon={<Send width={20} height={20} />} text="No submittals logged yet this week." />
        ) : (
          <ul className="divide-y divide-line">
            {weekSubs.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar text={initials(s.candidate_name)} tone="accent" />
                <div className="min-w-0 flex-1">
                  <span className="text-[14px] font-semibold text-ink">{s.candidate_name}</span>
                  <span className="ml-2 text-[12.5px] text-muted">{[s.client_name, s.position].filter(Boolean).join(" · ")}</span>
                </div>
                <span className="shrink-0 text-[12.5px] text-ink-soft nums">{prettyDate(s.submitted_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Weekly KPI history (running record) */}
      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-baseline gap-2">
            <h2 className="font-display text-[15px] font-bold text-ink">Weekly KPIs</h2>
            <span className="text-[12px] text-muted">Running record, last 5 weeks</span>
          </div>
          <Link href="/activity#history" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline">
            Full history <ArrowUpRight width={13} height={13} />
          </Link>
        </div>
        <WeeklyHistoryTable rows={weeklyHistory} />
      </div>
    </PageShell>
  );
}

function Money({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-surface-2/40 px-4 py-3">
      <div className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-1 font-display text-[22px] font-bold nums ${tone}`}>{value}</div>
    </div>
  );
}

function Avatar({ text, tone }: { text: string; tone: "ok" | "warn" | "accent" }) {
  const bg = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", accent: "bg-accent-soft text-accent" }[tone];
  return <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold ${bg}`}>{text}</span>;
}

function SectionHead({ title, note, href }: { title: string; note: string; href: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-5 py-4">
      <h3 className="font-display text-[15px] font-bold text-ink">{title}</h3>
      <Link href={href} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline">
        {note} <ArrowUpRight width={13} height={13} />
      </Link>
    </div>
  );
}

function MoreRow({ n, where }: { n: number; where: string }) {
  return <li className="px-5 py-2.5 text-center text-[12.5px] font-medium text-muted">+ {n} more in {where}</li>;
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-muted">{icon}</span>
      <p className="mt-2.5 text-[13.5px] text-muted">{text}</p>
    </div>
  );
}
