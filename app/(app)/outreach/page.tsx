import { redirect } from "next/navigation";

// Outreach now lives inside the Activity tab. Keep this route for old bookmarks.
export default function OutreachRedirect() {
  redirect("/activity#outreach");
}
