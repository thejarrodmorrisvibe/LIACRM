import { redirect } from "next/navigation";

// Brain Dump merged into Tasks — keep old links working.
export default function BrainDumpPage() {
  redirect("/tasks");
}
