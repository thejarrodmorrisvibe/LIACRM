"use client";

import { useState, useTransition } from "react";
import type { Candidate, Job, Stage } from "@/lib/types";
import { STAGES, STAGE_META, STAGE_LABEL } from "@/lib/types";
import { createCandidate, updateCandidate, deleteCandidate } from "@/lib/actions/candidates";
import { CandidateDetail } from "./CandidateDetail";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { Plus, Vial, Shield, CheckSquare } from "@/components/icons";
import { cn } from "@/lib/utils";

export function PipelineClient({ candidates, jobs }: { candidates: Candidate[]; jobs: Job[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const [editing, setEditing] = useState<Partial<Candidate> | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);

  function save(patch: Partial<Candidate>) {
    const isNew = !editing?.id;
    start(async () => {
      if (isNew) await createCandidate(patch);
      else await updateCandidate(editing!.id!, patch);
      toast(isNew ? "Candidate added" : "Candidate saved");
      setEditing(null);
    });
  }

  function remove() {
    if (!editing?.id) return;
    if (!confirm(`Delete ${editing.name}? This cannot be undone.`)) return;
    const id = editing.id;
    start(async () => {
      await deleteCandidate(id);
      toast("Candidate deleted", "info");
      setEditing(null);
    });
  }

  function moveTo(stage: Stage) {
    if (!dragId) return;
    const c = candidates.find((x) => x.id === dragId);
    setOverStage(null);
    setDragId(null);
    if (!c || c.stage === stage) return;
    start(async () => {
      await updateCandidate(c.id, { stage });
      toast(`${c.name} → ${stage}`);
    });
  }

  return (
    <div className="rise flex h-full flex-col px-4 pt-6 sm:px-6">
      <PageHeader
        title="Pipeline"
        subtitle="Drag candidates between stages. Click a card to edit details and compliance."
        action={
          <Button onClick={() => setEditing({ stage: "New" })}>
            <Plus width={17} height={17} /> Add Candidate
          </Button>
        }
      />

      <div className={cn("mt-5 flex flex-1 gap-2 overflow-x-auto scroll-thin pb-4", pending && "opacity-70")}>
        {STAGES.map((stage) => {
          const cards = candidates.filter((c) => c.stage === stage);
          const meta = STAGE_META[stage];
          const isOver = overStage === stage;
          return (
            <div
              key={stage}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={() => moveTo(stage)}
              className={cn(
                "flex min-w-[128px] flex-1 flex-col rounded-[var(--radius-lg)] border bg-surface-2/50 transition-colors",
                isOver ? "border-accent bg-accent-soft/40" : "border-line",
              )}
            >
              <div className="flex items-center justify-between gap-1 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.dot }} />
                  <span title={STAGE_LABEL[stage]} className="truncate text-[12.5px] font-bold text-ink">{STAGE_LABEL[stage]}</span>
                </div>
                <span className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 text-[11px] font-bold text-muted">
                  {cards.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto scroll-thin px-2 pb-3">
                {cards.map((c) => (
                  <CandidateCard
                    key={c.id}
                    c={c}
                    onOpen={() => setEditing(c)}
                    onDragStart={() => setDragId(c.id)}
                    dragging={dragId === c.id}
                    accent={meta.accent}
                  />
                ))}
                {cards.length === 0 && (
                  <div className="rounded-[10px] border border-dashed border-line-strong px-2 py-6 text-center text-[11.5px] text-faint">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <CandidateDetail
          candidate={editing}
          jobs={jobs}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={editing.id ? remove : undefined}
        />
      )}
    </div>
  );
}

function CandidateCard({
  c, onOpen, onDragStart, dragging, accent,
}: {
  c: Candidate;
  onOpen: () => void;
  onDragStart: () => void;
  dragging: boolean;
  accent: string;
}) {
  const initials = c.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      className={cn(
        "group cursor-pointer rounded-[var(--radius-md)] border border-line bg-surface p-2.5 shadow-[0_1px_2px_rgba(16,32,64,0.04)] transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-card)]",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10.5px] font-bold text-white"
          style={{ background: accent }}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-ink">{c.name}</div>
          <div className="truncate text-[11.5px] text-muted">{c.role || "Role TBD"}</div>
        </div>
      </div>
      {c.client_company && (
        <div className="mt-1.5 truncate text-[11.5px] text-ink-soft">{c.client_company}</div>
      )}
      <div className="mt-2 flex items-center gap-1.5">
        <CompliancePip on={c.offer_accepted} icon={CheckSquare} label="Offer" />
        <CompliancePip on={c.drug_tested} icon={Vial} label="Drug" />
        <CompliancePip on={c.background_cleared} icon={Shield} label="Background" />
      </div>
    </div>
  );
}

function CompliancePip({
  on, icon: Icon, label,
}: {
  on: boolean;
  icon: React.ComponentType<{ width?: number; height?: number; className?: string }>;
  label: string;
}) {
  return (
    <span
      title={`${label}: ${on ? "done" : "pending"}`}
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-full",
        on ? "bg-ok-soft text-ok" : "bg-surface-2 text-faint",
      )}
    >
      <Icon width={12} height={12} />
    </span>
  );
}
