import { listInterviews } from "@/lib/actions/interviews";
import { listCandidates } from "@/lib/actions/candidates";
import { InterviewsClient } from "@/components/interviews/InterviewsClient";

export const dynamic = "force-dynamic";

export default async function InterviewsPage() {
  const [interviews, candidates] = await Promise.all([listInterviews(), listCandidates()]);
  return <InterviewsClient interviews={interviews} candidates={candidates} />;
}
