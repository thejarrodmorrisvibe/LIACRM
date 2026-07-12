"use client";

import { useState } from "react";
import type { Candidate, Job, Stage } from "@/lib/types";
import { STAGES, STAGE_LABEL } from "@/lib/types";
import { candidateCommission, weeksWorked } from "@/lib/commission";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Vial, Shield, CheckSquare, Trash } from "@/components/icons";
import { cn, usd } from "@/lib/utils";

const EMPTY: Partial<Candidate> = {
  name: "", email: "", phone: "", role: "", client_company: "", pay_rate: null,
  stage: "New", drug_tested: false, background_cleared: false, offer_accepted: false,
  start_date: null, end_date: null, job_id: null, notes: "",
};

export function CandidateDetail({
  candidate, jobs, pending, onClose, onSave, onDelete,
}: {
  candidate: Partial<Candidate>;
  jobs: Job[];
  pending: boolean;
  onClose: () => void;
  onSave: (patch: Partial<Candidate>) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<Partial<Candidate>>({ ...EMPTY, ...candidate });
  const set = (patch: Partial<Candidate>) => setForm((f) => ({ ...f, ...patch }));
  const isNew = !candidate.id;
  const now = new Date();

  const earned =
    form.stage === "Started" && form.start_date
      ? candidateCommission(form.start_date, form.end_date ?? null, now)
      : 0;
  const wks =
    form.start_date ? weeksWorked(form.start_date, form.end_date ?? null, now) : 0;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isNew ? "Add Candidate" : form.name || "Candidate"}
      subtitle={isNew ? "Create a candidate and drop them into your pipeline." : form.role ?? undefined}
      footer={
        <div className="flex w-full items-center justify-between">
          {!isNew && onDelete ? (
            <Button variant="ghost" onClick={onDelete} className="text-bad hover:bg-bad-soft">
              <Trash width={16} height={16} /> Delete
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(form)} disabled={pending}>
              {pending ? "Saving…" : isNew ? "Add Candidate" : "Save Changes"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: core details */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={form.name ?? ""} onChange={(e) => set({ name: e.target.value })} placeholder="Jane Doe" />
            </Field>
            <Field label="Role / position">
              <Input value={form.role ?? ""} onChange={(e) => set({ role: e.target.value })} placeholder="Stress Engineer" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email ?? ""} onChange={(e) => set({ email: e.target.value })} placeholder="jane@email.com" />
            </Field>
            <Field label="Phone">
              <Input value={form.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} placeholder="(555) 012-3456" />
            </Field>
            <Field label="Client / company">
              <Input value={form.client_company ?? ""} onChange={(e) => set({ client_company: e.target.value })} placeholder="Boeing" />
            </Field>
            <Field label="Pay rate ($/hr)">
              <Input type="number" value={form.pay_rate ?? ""} onChange={(e) => set({ pay_rate: e.target.value === "" ? null : Number(e.target.value) })} placeholder="45" />
            </Field>
          </div>

          <Field label="Linked job opening">
            <Select value={form.job_id ?? ""} onChange={(e) => set({ job_id: e.target.value || null })}>
              <option value="">Not linked to a job</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.client_name} · {j.position_title}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Notes">
            <Textarea rows={4} value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Background, fit, conversations, next steps…" />
          </Field>
        </div>

        {/* Right: stage, compliance, dates, commission */}
        <div className="space-y-4">
          <Field label="Stage">
            <Select value={form.stage} onChange={(e) => set({ stage: e.target.value as Stage })}>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </Select>
          </Field>

          <div>
            <p className="mb-1.5 text-[12.5px] font-semibold text-ink-soft">Compliance</p>
            <div className="space-y-2">
              <ComplianceToggle label="Offer accepted" icon={CheckSquare} on={!!form.offer_accepted} onClick={() => set({ offer_accepted: !form.offer_accepted })} />
              <ComplianceToggle label="Drug test passed" icon={Vial} on={!!form.drug_tested} onClick={() => set({ drug_tested: !form.drug_tested })} />
              <ComplianceToggle label="Background cleared" icon={Shield} on={!!form.background_cleared} onClick={() => set({ background_cleared: !form.background_cleared })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <Input type="date" value={form.start_date ?? ""} onChange={(e) => set({ start_date: e.target.value || null })} />
            </Field>
            <Field label="End date" hint="Blank = ongoing">
              <Input type="date" value={form.end_date ?? ""} onChange={(e) => set({ end_date: e.target.value || null })} />
            </Field>
          </div>

          {form.stage === "Started" && form.start_date && (
            <div className="rounded-[var(--radius-md)] border border-ok/30 bg-ok-soft/60 p-3.5">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ok">Commission to date</p>
              <p className="mt-0.5 font-display text-[22px] font-bold text-ok nums">{usd(earned, { cents: true })}</p>
              <p className="text-[12px] text-ink-soft">{wks.toFixed(1)} weeks · $10.00 / week</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ComplianceToggle({
  label, icon: Icon, on, onClick,
}: {
  label: string;
  icon: React.ComponentType<{ width?: number; height?: number; className?: string }>;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] border px-3 py-2 text-left text-[13px] font-semibold transition-colors",
        on ? "border-ok/40 bg-ok-soft text-ok" : "border-line-strong bg-surface text-muted hover:border-faint",
      )}
    >
      <span className={cn("grid h-6 w-6 place-items-center rounded-full", on ? "bg-ok text-white" : "bg-surface-2 text-faint")}>
        <Icon width={14} height={14} />
      </span>
      <span className="flex-1">{label}</span>
      <span className={cn("text-[11.5px]", on ? "text-ok" : "text-faint")}>{on ? "Done" : "Pending"}</span>
    </button>
  );
}
