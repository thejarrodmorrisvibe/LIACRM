"use client";

import { useMemo, useState } from "react";
import type { Activity, Submittal, Interview, Candidate } from "@/lib/types";
import { buildWeeklyReport } from "@/lib/report";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { Send } from "@/components/icons";

export function WeeklyReportButton({
  activities, submittals, interviews, candidates, variant = "primary", label = "Weekly Report",
}: {
  activities: Activity[];
  submittals: Submittal[];
  interviews: Interview[];
  candidates: Candidate[];
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { subject, body } = useMemo(
    () => buildWeeklyReport(activities, submittals, interviews, candidates),
    [activities, submittals, interviews, candidates],
  );

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}><Send width={16} height={16} /> {label}</Button>
      {open && (
        <Modal
          open onClose={() => setOpen(false)}
          title="Weekly KPI Report"
          subtitle="Copy this or open it in your email to send to your boss."
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
              <a href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>
                <Button variant="secondary">Open in email</Button>
              </a>
              <Button onClick={() => { navigator.clipboard?.writeText(body); toast("Report copied"); }}>Copy report</Button>
            </>
          }
        >
          <Textarea readOnly rows={20} value={body} className="font-mono text-[12.5px] leading-relaxed" />
        </Modal>
      )}
    </>
  );
}
