import { listSubmittals } from "@/lib/actions/submittals";
import { listCandidates } from "@/lib/actions/candidates";
import { SubmittalsClient, type Period } from "@/components/submittals/SubmittalsClient";

export const dynamic = "force-dynamic";

const VALID: Period[] = ["today", "week", "month", "all"];

export default async function SubmittalsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const [{ period }, submittals, candidates] = await Promise.all([
    searchParams,
    listSubmittals(),
    listCandidates(),
  ]);
  const initialPeriod = VALID.includes(period as Period) ? (period as Period) : "all";
  return <SubmittalsClient submittals={submittals} candidates={candidates} initialPeriod={initialPeriod} />;
}
