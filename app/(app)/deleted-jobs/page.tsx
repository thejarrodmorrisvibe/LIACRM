import { listDeletedJobs } from "@/lib/actions/jobs";
import { listCandidates } from "@/lib/actions/candidates";
import { DeletedJobsClient } from "@/components/jobs/DeletedJobsClient";

export const dynamic = "force-dynamic";

export default async function DeletedJobsPage() {
  const [jobs, candidates] = await Promise.all([listDeletedJobs(), listCandidates()]);
  return <DeletedJobsClient jobs={jobs} candidates={candidates} />;
}
