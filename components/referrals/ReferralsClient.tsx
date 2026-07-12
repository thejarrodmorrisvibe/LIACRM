"use client";

import { useMemo, useState, useTransition } from "react";
import type { Referral, Candidate } from "@/lib/types";
import { referralStatus, REFERRAL_BONUS, REFERRAL_WORKING_DAYS } from "@/lib/referrals";
import { createReferral, deleteReferral, toggleReferralPaid } from "@/lib/actions/referrals";
import { PageHeader, PageShell } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { Gift, Plus, Trash, Calendar, Users, Sparkles, ArrowUpRight, CheckSquare } from "@/components/icons";
import { prettyDate, usd } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);
const initials = (s: string) => s.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export function ReferralsClient({
  referrals,
  candidates,
}: {
  referrals: Referral[];
  candidates: Candidate[];
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const t = today();

  const rows = useMemo(
    () => referrals.map((r) => ({ r, st: referralStatus(r.referral_start_date, t) })),
    [referrals, t],
  );

  const achieved = rows.filter((x) => x.st.achieved).length;
  const pendingCount = rows.filter((x) => x.r.referral_start_date && !x.st.achieved).length;
  const earned = rows.filter((x) => x.st.achieved).reduce((s, x) => s + (x.r.bonus_amount || REFERRAL_BONUS), 0);

  function remove(r: Referral) {
    if (!confirm(`Delete the referral for ${r.referral_name}?`)) return;
    start(async () => { await deleteReferral(r.id); toast("Referral removed", "info"); });
  }
  function togglePaid(r: Referral) {
    start(() => toggleReferralPaid(r.id, !r.bonus_paid));
  }

  return (
    <PageShell>
      <PageHeader
        title="Referrals"
        subtitle={`${usd(REFERRAL_BONUS)} bonus when a referred candidate works ${REFERRAL_WORKING_DAYS} working days (Mon–Fri).`}
        action={<Button onClick={() => setAdding(true)}><Plus width={17} height={17} /> Add Referral</Button>}
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Referrals" value={referrals.length} accent="blue" icon={<Users width={17} height={17} />} sub="tracked" />
        <StatCard label="Bonuses Earned" value={achieved} accent="emerald" icon={<Gift width={17} height={17} />} sub="hit 30 working days" />
        <StatCard label="Still Pending" value={pendingCount} accent="amber" icon={<Calendar width={17} height={17} />} sub="counting down" />
        <StatCard label="Total Earned" value={usd(earned)} accent="violet" icon={<Sparkles width={17} height={17} />} sub={`${usd(REFERRAL_BONUS)} each`} />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="font-display text-[15px] font-bold text-ink">Referral Log</h3>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent"><Gift width={22} height={22} /></span>
            <p className="mt-3 font-display font-bold text-ink">No referrals yet</p>
            <p className="mt-1 mx-auto max-w-sm text-[13.5px] text-muted">
              Add one when a candidate refers someone. Once the referral works {REFERRAL_WORKING_DAYS} days, the {usd(REFERRAL_BONUS)} bonus is due.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[1.5fr_150px_1.3fr_150px_56px] gap-4 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-faint lg:grid">
              <span>Referrer → Referral</span><span>Start date</span><span>Bonus due (30 days)</span><span className="text-right">Bonus</span><span />
            </div>
            <ul className="divide-y divide-line">
              {rows.map(({ r, st }) => (
                <li key={r.id} className="grid grid-cols-1 gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-surface-2 lg:grid-cols-[1.5fr_150px_1.3fr_150px_56px] lg:items-center">
                  {/* Referrer → Referral */}
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent">{initials(r.referrer_name)}</span>
                    <div className="min-w-0 text-[13.5px]">
                      <div className="truncate font-semibold text-ink">{r.referrer_name}</div>
                      <div className="truncate text-muted">referred <span className="font-medium text-ink-soft">{r.referral_name}</span></div>
                    </div>
                  </div>

                  {/* Start date */}
                  <div className="text-[13px] text-ink-soft nums lg:block">
                    <span className="lg:hidden text-muted">Started: </span>{r.referral_start_date ? prettyDate(r.referral_start_date) : "—"}
                  </div>

                  {/* Bonus due */}
                  <div>
                    {!r.referral_start_date ? (
                      <Badge tone="neutral">Add a start date</Badge>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-[14px] font-bold text-ink nums">{prettyDate(st.mfDate)}</span>
                          {r.bonus_paid ? (
                            <Badge tone="neutral" dot>Paid</Badge>
                          ) : st.achieved ? (
                            <Badge tone="ok" dot>Bonus due</Badge>
                          ) : (
                            <Badge tone={st.daysUntil != null && st.daysUntil <= 7 ? "warn" : "info"}>
                              in {st.daysUntil} {st.daysUntil === 1 ? "day" : "days"}
                            </Badge>
                          )}
                        </div>
                        {st.satDate && st.satDate !== st.mfDate && (
                          <div className="text-[12px] text-muted">
                            {st.achievedIfSat && !st.achieved
                              ? <span className="font-semibold text-accent-2">Due now if Saturdays worked</span>
                              : <>If Saturdays worked: <span className="font-medium text-ink-soft nums">{prettyDate(st.satDate)}</span></>}
                          </div>
                        )}
                        {r.reminder_created && !r.bonus_paid && (
                          <div className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ok">
                            <CheckSquare width={12} height={12} /> Payroll task created
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bonus + paid */}
                  <div className="flex items-center gap-2 lg:justify-end">
                    <span className="font-display text-[14px] font-bold text-ink nums">{usd(r.bonus_amount || REFERRAL_BONUS)}</span>
                    <button
                      onClick={() => togglePaid(r)}
                      disabled={pending}
                      className={
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors " +
                        (r.bonus_paid ? "bg-ok-soft text-ok" : "bg-surface-2 text-muted hover:bg-accent-soft hover:text-accent")
                      }
                    >
                      {r.bonus_paid ? "Paid ✓" : "Mark paid"}
                    </button>
                  </div>

                  {/* Delete */}
                  <div className="lg:text-right">
                    <button onClick={() => remove(r)} className="grid h-8 w-8 place-items-center rounded-[8px] text-faint hover:bg-bad-soft hover:text-bad lg:ml-auto" aria-label="Delete">
                      <Trash width={15} height={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-lg)] border border-accent/20 bg-accent-soft/40 p-4">
        <ArrowUpRight width={18} height={18} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-[13px] text-ink-soft">
          <strong className="text-ink">How the dates work:</strong> the bonus date counts {REFERRAL_WORKING_DAYS} working days
          from the start, Monday–Friday. The smaller line shows when it would land instead if the referral also works
          Saturdays — handy when you need to confirm eligibility.
        </p>
      </div>

      {adding && (
        <AddReferralForm
          candidates={candidates}
          pending={pending}
          onClose={() => setAdding(false)}
          onSave={(form) =>
            start(async () => {
              await createReferral(form);
              toast("Referral added");
              setAdding(false);
            })
          }
        />
      )}
    </PageShell>
  );
}

function AddReferralForm({
  candidates, onClose, onSave, pending,
}: {
  candidates: Candidate[];
  onClose: () => void;
  onSave: (form: Partial<Referral>) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState<Partial<Referral>>({
    referrer_name: "", referral_name: "", referral_start_date: "", bonus_amount: REFERRAL_BONUS, notes: "",
  });
  const set = (patch: Partial<Referral>) => setForm((f) => ({ ...f, ...patch }));

  function pickReferrer(id: string) {
    const c = candidates.find((x) => x.id === id);
    set({ referrer_candidate_id: id || null, ...(c ? { referrer_name: c.name } : {}) });
  }
  function pickReferral(id: string) {
    const c = candidates.find((x) => x.id === id);
    set({
      referral_candidate_id: id || null,
      ...(c ? { referral_name: c.name, referral_start_date: c.start_date ?? form.referral_start_date } : {}),
    });
  }

  return (
    <Modal
      open onClose={onClose}
      title="Add Referral"
      subtitle={`Track a referral toward the ${usd(REFERRAL_BONUS)} bonus.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={pending || !form.referrer_name?.trim() || !form.referral_name?.trim()}>
            {pending ? "Saving…" : "Add Referral"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Referring candidate" hint="Who gets the bonus">
          <Select value={form.referrer_candidate_id ?? ""} onChange={(e) => pickReferrer(e.target.value)}>
            <option value="">Type a name below</option>
            {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Referrer name">
          <Input value={form.referrer_name ?? ""} onChange={(e) => set({ referrer_name: e.target.value, referrer_candidate_id: null })} placeholder="Marcus Reyes" />
        </Field>
        <Field label="Referred candidate" hint="The new hire">
          <Select value={form.referral_candidate_id ?? ""} onChange={(e) => pickReferral(e.target.value)}>
            <option value="">Type a name below</option>
            {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Referral name">
          <Input value={form.referral_name ?? ""} onChange={(e) => set({ referral_name: e.target.value, referral_candidate_id: null })} placeholder="Priya Natarajan" />
        </Field>
        <Field label="Referral start date">
          <Input type="date" value={form.referral_start_date ?? ""} onChange={(e) => set({ referral_start_date: e.target.value || null })} />
        </Field>
        <Field label="Bonus amount ($)">
          <Input type="number" value={form.bonus_amount ?? REFERRAL_BONUS} onChange={(e) => set({ bonus_amount: e.target.value === "" ? REFERRAL_BONUS : Number(e.target.value) })} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything to remember about this referral…" />
        </Field>
      </div>
    </Modal>
  );
}
