import { listJobs } from "@/lib/actions/jobs";
import { listCandidates } from "@/lib/actions/candidates";
import { JobsClient } from "@/components/jobs/JobsClient";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const [jobs, candidates] = await Promise.all([listJobs(), listCandidates()]);
  return <JobsClient jobs={jobs} candidates={candidates} />;
}
