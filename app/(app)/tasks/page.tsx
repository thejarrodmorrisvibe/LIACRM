import { listTasks } from "@/lib/actions/tasks";
import { listCandidates } from "@/lib/actions/candidates";
import { TasksClient } from "@/components/tasks/TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, candidates] = await Promise.all([listTasks(), listCandidates()]);
  return <TasksClient tasks={tasks} candidates={candidates} />;
}
