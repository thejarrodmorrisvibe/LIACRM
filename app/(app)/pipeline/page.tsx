import { listCandidates } from "@/lib/actions/candidates";
import { listJobs } from "@/lib/actions/jobs";
import { PipelineClient } from "@/components/candidates/PipelineClient";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const [candidates, jobs] = await Promise.all([listCandidates(), listJobs()]);
  return <PipelineClient candidates={candidates} jobs={jobs} />;
}
