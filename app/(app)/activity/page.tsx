import { listActivities, listAllActivities, listOutreach } from "@/lib/actions/activities";
import { listSubmittals } from "@/lib/actions/submittals";
import { listInterviews } from "@/lib/actions/interviews";
import { listCandidates } from "@/lib/actions/candidates";
import { listJobs } from "@/lib/actions/jobs";
import { buildWeeklyHistory } from "@/lib/weekly-history";
import { ActivityClient } from "@/components/activity/ActivityClient";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const [activities, allActivities, outreach, submittals, interviews, candidates, jobs] = await Promise.all([
    listActivities(), listAllActivities(), listOutreach(), listSubmittals(), listInterviews(), listCandidates(), listJobs(),
  ]);
  const weeklyHistory = buildWeeklyHistory(allActivities, submittals, candidates);
  return (
    <ActivityClient
      activities={activities}
      outreach={outreach}
      submittals={submittals}
      interviews={interviews}
      candidates={candidates}
      jobs={jobs}
      weeklyHistory={weeklyHistory}
    />
  );
}
