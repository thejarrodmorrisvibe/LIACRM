import { listReferrals, ensureReferralReminders } from "@/lib/actions/referrals";
import { listCandidates } from "@/lib/actions/candidates";
import { ReferralsClient } from "@/components/referrals/ReferralsClient";

export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  await ensureReferralReminders();
  const [referrals, candidates] = await Promise.all([listReferrals(), listCandidates()]);
  return <ReferralsClient referrals={referrals} candidates={candidates} />;
}
