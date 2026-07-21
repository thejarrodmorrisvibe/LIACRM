# Porting the 2026-07-21 Job Openings work into another CRM

Everything built in Lia's CRM on 2026-07-21, written so you can reproduce it in
the other (Apex) CRM. Both apps started from the same codebase, so most of this
is copy-paste.

Two ways to apply it:

- **Fast path** — apply `docs/jobs-features-2026-07-21.patch` (see *Applying the patch*).
- **Manual path** — follow *Feature by feature* below.

Either way, **run the SQL migration first** or every job page will break.

---

## 0a. Pre-flight: state of `TEST1/recruiter-crm` (checked 2026-07-21)

I dry-ran the patch against the Apex CRM. Findings:

**⚠️ It has ~10 uncommitted modified files** — including `JobsClient.tsx`,
`AppFrame.tsx`, `app/(app)/layout.tsx`, `components/icons.tsx`. **Commit or stash
that work before applying anything**, or you risk tangling it with this patch.

```bash
cd TEST1/recruiter-crm
git status              # review the in-progress work
git stash               # or commit it
```

**Already present** (don't re-add):

- JD popup — `setViewing` is already wired in its `JobsClient.tsx`
- State grouping — it already has `lib/us-states.ts` and uses `statesOf()`
- `description` on the `Job` type **and** in its `supabase/schema-full.sql`
- A `hot-openings` page

**Missing — this is the actual work to port:**

| Feature | Status there |
|---------|--------------|
| Flame toggle (`HotToggle` / `toggleHot`) | absent |
| Inline note editing (`InlineNotes`) | absent |
| Soft delete / Deleted Jobs (`deleted_at`) | absent |
| Editable JD popup (`JobFields` in the modal) | absent |
| `OTHER_STATE` / `locationInState` helpers | absent |

**Patch result:** everything applies cleanly **except
`components/jobs/JobsClient.tsx`**, which has diverged. So:

```bash
git apply --exclude='components/jobs/JobsClient.tsx' path/to/jobs-features-2026-07-21.patch
```

…then hand-apply §3.5 to its `JobsClient.tsx`. Don't copy Lia's version over the
top — the Apex one has its own edits you'd lose.

---

## 0. Prerequisite: SQL migration (required)

The Deleted Jobs feature needs one column. Run this in the target project's
Supabase **SQL Editor → New query → Run**:

```sql
alter table jobs add column if not exists deleted_at timestamptz;
create index if not exists idx_jobs_deleted_at on jobs(deleted_at);
```

**Do this before deploying the code.** `listJobs()` filters on `deleted_at`, so
if the column is missing every job query fails and Job Openings / Hot Openings /
Dashboard all render empty. (No data is lost when this happens — the queries just
return nothing — but the app looks broken.)

Nothing else here needs a schema change: `description`, `requirements`,
`client_note`, `notes` and `is_hot` already exist on `jobs`.

---

## 1. What was built

| # | Feature | Where |
|---|---------|-------|
| 1 | Shared JD popup (click a job title → full description) | `components/jobs/JobDetail.tsx` |
| 2 | Flame toggle to pin/unpin a req to the hot list | Jobs rows + Hot Openings |
| 3 | Job notes shown **under the role** in the list | Both tabs |
| 4 | "Your Pinned Reqs" section on Hot Openings (from `jobs.is_hot`) | `components/jobs/HotJobsSection.tsx` |
| 5 | State dropdown filter | Both tabs |
| 6 | Edit **every** field from inside the JD popup | `JobDetail.tsx` |
| 7 | Edit notes **inline** from the main list | `InlineNotes` in `JobDetail.tsx` |
| 8 | Deleted Jobs tab with Restore (soft delete) | `components/jobs/DeletedJobsClient.tsx` |

---

## 2. Files

### New — copy these across wholesale

| File | Purpose |
|------|---------|
| `components/jobs/JobDetail.tsx` | The shared core. Exports `JobDetail` (popup + edit mode), `JobFields` (all 12 inputs), `InlineNotes`, `HotToggle`, `payLabel`, `Openings`, `DetailSection`. |
| `components/jobs/HotJobsSection.tsx` | Pinned-reqs list for the Hot Openings page. |
| `components/jobs/DeletedJobsClient.tsx` | The recycle-bin page UI. |
| `app/(app)/deleted-jobs/page.tsx` | Server page: `listDeletedJobs()` + `listCandidates()`. |

### Modified

| File | Change |
|------|--------|
| `lib/types.ts` | Add `deleted_at: string \| null;` to `Job`. |
| `lib/us-states.ts` | Add `OTHER_STATE` constant and `locationInState()` helper. |
| `lib/actions/jobs.ts` | Soft delete, restore, purge, `listDeletedJobs`, revalidate new routes. |
| `components/jobs/JobsClient.tsx` | Import shared pieces, add flame + inline notes + state filter; local `JobDetail`/`payLabel`/`Openings` definitions **removed**. |
| `app/(app)/hot-openings/page.tsx` | Becomes `async`, fetches jobs, renders `HotJobsSection` above the existing static list. |
| `components/layout/AppFrame.tsx` | Add the Deleted Jobs nav entry. |

---

## 3. Feature by feature

### 3.1 `lib/types.ts`

```ts
export interface Job {
  // …existing fields…
  notes: string | null;
  deleted_at: string | null; // set when sent to Deleted Jobs; null while live
  created_at: string;
  updated_at: string;
}
```

### 3.2 `lib/us-states.ts`

Append alongside the existing `statesOf()`:

```ts
/** Bucket label for reqs whose location has no recognisable state. */
export const OTHER_STATE = "Other / Unspecified";

/**
 * True when a location belongs to the given state name. Locations with no
 * parseable state match only the OTHER_STATE bucket.
 */
export function locationInState(location: string | null | undefined, stateName: string): boolean {
  const sts = statesOf(location);
  if (sts.length === 0) return stateName === OTHER_STATE;
  return sts.some((s) => s.name === stateName);
}
```

Both tabs use this so a multi-state req (e.g. `"Hartford, CT Tucson, AZ Wichita, KS"`)
matches under each of its states consistently.

### 3.3 `lib/actions/jobs.ts`

**Revalidate the new routes:**

```ts
function revalidateAll() {
  revalidatePath("/jobs");
  revalidatePath("/hot-openings");   // added
  revalidatePath("/deleted-jobs");   // added
  revalidatePath("/pipeline");
  revalidatePath("/roster");
}
```

**Exclude deleted reqs from the main list** — add `.is("deleted_at", null)` to
`listJobs()` (and `.filter((j) => !j.deleted_at)` in the demo branch).

**Add `listDeletedJobs()`** — `.not("deleted_at", "is", null)`, ordered by
`deleted_at` descending.

**`deleteJob()` becomes a soft delete** (this is the important behavioural change):

```ts
export async function deleteJob(id: string): Promise<void> {
  const now = new Date().toISOString();
  // …demo branch…
  const sb = await createClient();
  await sb.from("jobs").update({ deleted_at: now, is_hot: false }).eq("id", id);
  revalidateAll();
}
```

Setting `is_hot: false` matters — otherwise a deleted req keeps showing on Hot Openings.

**Add `restoreJob()`** (`deleted_at: null`) and **`purgeJob()`** (the old hard
`.delete()`). Only the Deleted Jobs page calls `purgeJob`.

> **Leave `sanitize()` alone.** Its allow-list deliberately excludes `deleted_at`,
> so the popup editor can't accidentally delete or resurrect a req while saving
> other fields.

### 3.4 `JobDetail.tsx` — the shared core

Previously `JobDetail`, `payLabel` and `Openings` lived inside `JobsClient.tsx`,
so only the Jobs tab could use them. They're now exported from one module used by
Job Openings, Hot Openings and Deleted Jobs — which is what keeps the three tabs
behaving identically.

Key pieces:

- **`JobDetail`** — read-only popup that flips into an edit form in the *same*
  modal (`const [editing, setEditing] = useState(false)`), saving via `updateJob`.
  The read view renders a merged `{ ...job, ...form }` so saved values appear
  immediately, before the server round-trip lands.
- **`JobFields`** — all 12 inputs (client, position, location, pay type, min, max,
  hire type, status, description, requirements, client note, notes). Shared by the
  popup's edit mode *and* the Add Opening form, so the two can't drift apart.
- **`InlineNotes`** — the note under a role, editable in place. Click the note (or
  "＋ Add note" when empty) → textarea; Ctrl/⌘+Enter saves, Esc cancels.
- **`HotToggle`** — the flame button. Filled when hot, outline when not.

### 3.5 `JobsClient.tsx`

- Import from the shared module; **delete** the local `JobDetail`, `DetailSection`,
  `payLabel` and `Openings` definitions.
- Render `<HotToggle hot={j.is_hot} onToggle={() => hot(j)} pending={pending} />`
  in each row's action cell, and widen the actions grid column
  (`…_130px_64px]` → `…_130px_96px]`) so three buttons fit.
- Replace the static notes paragraph with
  `<InlineNotes key={`${j.id}:${j.notes ?? ""}`} job={j} />`.
  The key forces a remount when the server sends a new value.
- Add the state `<Select>` beside the search input, plus the
  "Showing N roles in X · Clear" banner.
- Include `notes` and `description` in the search filter array.
- Drop `onEdit` from the `<JobDetail>` call — the popup owns editing now.

### 3.6 `hot-openings/page.tsx`

Becomes an async server component:

```ts
export const dynamic = "force-dynamic";

export default async function HotOpeningsPage() {
  const [allJobs, candidates] = await Promise.all([listJobs(), listCandidates()]);
  const hotJobs = allJobs.filter((j) => j.is_hot);
  // …
}
```

Render `<HotJobsSection jobs={hotJobs} candidates={candidates} />` **above** the
existing static list, which is left untouched under its own heading.

> If the other CRM has no static hot list, drop that section and let
> `HotJobsSection` be the whole page.

### 3.7 `AppFrame.tsx`

```ts
{ href: "/deleted-jobs", label: "Deleted Jobs", icon: Trash, hint: "Restore removed reqs" },
```

Placed between Hot Openings and Tasks; add `Trash` to the icon import.

---

## 4. Applying the patch

```bash
cd /path/to/other-crm
git checkout -b jobs-features
git apply --check ../lias-crm/docs/jobs-features-2026-07-21.patch   # dry run
git apply           ../lias-crm/docs/jobs-features-2026-07-21.patch
npm run build
```

`--check` reports conflicts without touching anything. If the other CRM's
`JobsClient.tsx` has diverged, expect rejects there — copy the four **new** files
in cleanly and hand-apply the `JobsClient.tsx` edits from §3.5.

The patch intentionally excludes:

- `package.json` / `package-lock.json` (only the AI-SDK removal — see §5)
- `lib/hot-openings.ts` (Lia-specific data)

---

## 5. Deliberately excluded

- **AI assistant removal.** Lia's CRM dropped the floating chat: deleted
  `components/assistant/AssistantWidget.tsx`, `app/api/chat/route.ts`,
  `lib/assistant-context.ts`, the `<AssistantWidget />` mount in
  `app/(app)/layout.tsx`, and the `@anthropic-ai/sdk` dependency. **Only do this
  in the other CRM if you also want the chat gone.**
- **Hot list data edits** (AV Inc ×3 seats, Aviocraft removed) — specific to
  Lia's tracker, not code.

---

## 6. Verifying

1. **Migration** — `select id, deleted_at from jobs limit 1;` should succeed.
2. **Job Openings** — count matches before the change (deleted reqs excluded).
3. **Flame** — pin a req, confirm `is_hot = true`, confirm it appears on Hot Openings.
4. **JD popup** — click a title on *both* tabs → Edit → all 12 fields → Save persists.
5. **Inline notes** — click a note in the list, edit, save; check the row and DB.
6. **State filter** — pick a state, confirm only that group shows and the count matches.
7. **Delete → restore** — delete a req, confirm it leaves Job Openings and appears in
   Deleted Jobs, then Restore and confirm it returns and `deleted_at` is null again.

Watch for: a req whose location names several states renders one row **per state**
on Job Openings. They're the same record, so pinning one flame lights all of them.
That's expected.

---

## 7. Commit reference

| Commit | Change |
|--------|--------|
| `79d7daa` | Flame toggle, notes under role, shared JD popup |
| `a37e9b8` | State dropdown filter |
| `651152a` | Edit every field from the JD popup |
| `12cdf7f` | Inline note editing from the list |
| `7381519` | Deleted Jobs tab with restore |
| `216e511` | *(optional)* AI assistant removal |
| `a9cef27` | *(data only)* hot list edits |

Repo: <https://github.com/thejarrodmorrisvibe/LIACRM>
