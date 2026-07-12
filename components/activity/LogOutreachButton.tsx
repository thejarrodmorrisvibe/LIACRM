"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Job } from "@/lib/types";
import { logActivity, type ActivityMeta } from "@/lib/actions/activities";
import { cleanJobTitle } from "@/lib/job-title";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { Send } from "@/components/icons";

export function LogOutreachButton({
  jobs, onLogged, variant = "primary", label = "Log Outreach",
}: {
  jobs: Job[];
  /** Called after a successful log for optimistic UI (amount + tags). */
  onLogged?: (amount: number, meta: ActivityMeta) => void;
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [jobId, setJobId] = useState("");
  const [clientName, setClientName] = useState("");
  const [notes, setNotes] = useState("");

  // Open jobs first, then the rest; each option carries its client + title.
  const jobOptions = useMemo(
    () => [...jobs].sort(
      (a, b) => Number(b.status === "Open") - Number(a.status === "Open")
        || a.client_name.localeCompare(b.client_name)
        || a.position_title.localeCompare(b.position_title),
    ),
    [jobs],
  );
  const clientOptions = useMemo(
    () => [...new Set(jobs.map((j) => j.client_name))].sort((a, b) => a.localeCompare(b)),
    [jobs],
  );

  const selectedJob = jobOptions.find((j) => j.id === jobId) ?? null;

  function reset() {
    setAmount(""); setJobId(""); setClientName(""); setNotes("");
  }

  function submit() {
    const n = Math.round(Number(amount));
    if (!n || n < 1) { toast("Enter a number of people reached"); return; }

    const note = notes.trim() || null;
    const meta: ActivityMeta = selectedJob
      ? { job_id: selectedJob.id, job_label: cleanJobTitle(selectedJob.position_title), client_name: selectedJob.client_name, notes: note }
      : clientName
        ? { client_name: clientName, notes: note }
        : { notes: note };

    onLogged?.(n, meta);
    start(async () => {
      await logActivity("outreach", n, meta);
      router.refresh();
    });

    const tag = selectedJob
      ? `${selectedJob.client_name} · ${cleanJobTitle(selectedJob.position_title)}`
      : clientName || "untagged";
    toast(`Logged ${n} outreach (${tag})`);
    reset();
    setOpen(false);
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}><Send width={16} height={16} /> {label}</Button>
      {open && (
        <Modal
          open onClose={() => setOpen(false)} size="sm"
          title="Log Outreach"
          subtitle="Record a batch of outreach and tag it to a job or client."
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={pending}>Log outreach</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="How many people did you reach?" hint="e.g. a mass email to 34 people → enter 34">
              <Input
                type="number" min={1} inputMode="numeric" autoFocus
                placeholder="34"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
            </Field>

            <Field label="Tag to a job opening (optional)" hint="Picking a job automatically attributes it to that client.">
              <Select value={jobId} onChange={(e) => { setJobId(e.target.value); if (e.target.value) setClientName(""); }}>
                <option value="">— No specific job —</option>
                {jobOptions.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.client_name} · {cleanJobTitle(j.position_title)}{j.location ? ` (${j.location})` : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Or just tag a client (optional)">
              <Select value={clientName} disabled={!!jobId} onChange={(e) => setClientName(e.target.value)}>
                <option value="">— No client —</option>
                {clientOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>

            <Field label="Notes (optional)" hint="Clarify this outreach — e.g. who you emailed or the context. Shows up in your weekly report.">
              <Textarea
                rows={2}
                placeholder="Sent intro email to 6 hiring managers about the Avionics reqs…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}
