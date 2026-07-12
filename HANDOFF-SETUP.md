# Lia's CRM — Set It Up On Your Computer

Hi Lia! This is your own recruiting CRM — candidate pipeline, submittals, job openings, a hot-openings board, activity KPIs, weekly reports, commissions, and an optional AI assistant. It's the same app Micah uses, recolored and made yours. This guide gets **you** a private copy with **none of anyone else's candidates or numbers** — a fresh, empty CRM that's 100% yours.

> **Tip:** The easiest way to do this is to open this folder in **Claude Code** and say *"Follow HANDOFF-SETUP.md and set this up for me."* It can do almost every step for you. The steps that need a human (making free accounts, pasting keys) are marked 👤.

---

## The short version

Your data lives in **Supabase** (a free cloud database), **not** in the code. So this code + your own new Supabase project = the exact same app, empty and ready for your data. Setup is ~20–30 minutes, all on free tiers.

You'll make three free accounts:
1. **Supabase** — the database → https://supabase.com
2. **Vercel** — hosting, so you can use it on your phone + laptop → https://vercel.com
3. *(Optional)* **Anthropic** — only if you want the in-app AI chat → https://console.anthropic.com

---

## Step 0 — Get the tools 👤

- **Node.js 20 or newer** — https://nodejs.org (download the "LTS" version, click through the installer).
- **A code editor** — [Claude Code](https://claude.com/claude-code) is easiest since it can run these steps for you. VS Code works too.

Unzip the `lias-crm` folder somewhere easy to find (like your Desktop) and open that folder in your editor/terminal.

---

## Step 1 — Install the app's building blocks

In a terminal opened to the `lias-crm` folder, run:

```bash
npm install
```

This downloads everything the app needs. It takes a couple minutes and only has to be done once.

---

## Step 2 — Create your database 👤

1. Go to https://supabase.com, sign in, click **New project**. Give it a name (e.g. "lias-crm"), set a strong database password (save it somewhere), pick a region near you. Wait ~2 minutes while it sets up.
2. In your project, open **SQL Editor** → **New query**.
3. Open the file **`supabase/schema-full.sql`** from this folder, copy **everything** in it, paste it into the SQL editor, and click **Run**. This builds every table, empty and ready.
4. Go to **Project Settings → API** and copy two values (keep them handy for the next step):
   - **Project URL** — looks like `https://abcd1234.supabase.co`
   - **anon / publishable key** — the long public key (safe to use in the app)

---

## Step 3 — Connect the app to your database

Create a new file named **`.env.local`** in the `lias-crm` folder, with your two values from Step 2:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-KEY
```

That's the only setup needed to start — the app runs in **open-access mode** (no password) by default.

---

## Step 4 — Run it and take a look

```bash
npm run dev
```

Open the address it prints (usually http://localhost:3000). You should see the Dashboard with everything at zero. Click around — Pipeline, Submittals, Job Openings, Activity, Hot Openings, Commissions. If the pages load, your database is wired up correctly. 🎉

---

## Step 5 — Make it fully yours (optional tweaks)

Almost everything personal lives in your database, which is empty. A few small things live in the code — all optional:

1. **Hot Openings board** comes preloaded with your team's shared openings (`lib/hot-openings.ts`). Since you're on the same GAL team, you can leave it. When the open reqs change, edit that file (or ask Claude Code to).
2. **Weekly report + AI assistant** already say **Lia**. If you ever want your full name on the emailed report, open `lib/report.ts` and change the two "Lia" lines.
3. **KPI targets** (`lib/kpi.ts`) match the team's weekly/daily goals. Only change them if yours differ.
4. **Commission quarters** already use GAL's fiscal calendar (year starts May 1: Q1 May–Jul, Q2 Aug–Oct, Q3 Nov–Jan, Q4 Feb–Apr) in `lib/commission.ts`. Leave as-is.

Everything else — candidates, jobs, submittals, activity — starts empty because it's in your fresh Supabase. Just start adding your own.

---

## Step 6 — Put it online so you can use it on your phone 👤

1. Go to https://vercel.com and sign in (GitHub or email).
2. Install the Vercel tool and deploy from the `lias-crm` folder:
   ```bash
   npm i -g vercel
   vercel --prod
   ```
   Follow the prompts and accept the defaults — it creates the project for you.
3. In your new Vercel project → **Settings → Environment Variables**, add the **same two** values from Step 3 (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`) for **Production**, then run `vercel --prod` again so they take effect.
4. Vercel gives you a link like `https://lias-crm.vercel.app` — bookmark it on your phone and laptop. Done!

---

## Step 7 — (Optional) Turn on the AI assistant 👤

The floating "Lia's Assistant" chat answers questions about your data. It needs an Anthropic API key:
1. Create a key at https://console.anthropic.com (Settings → API Keys) and add a little billing credit.
2. In Vercel → **Settings → Environment Variables**, add `ANTHROPIC_API_KEY = sk-ant-...` (Production), then redeploy with `vercel --prod`.
   *(To use it while running locally too, add the same line to your `.env.local`.)*

Without this key, the chat just shows a friendly "not configured" message and everything else works fine. To keep costs low, you can switch the model to `claude-haiku-4-5` in `app/api/chat/route.ts` (find `const MODEL = ...`).

---

## Good to know

- **Open access = no password.** Anyone with your app link can view/edit your data, so keep the link private. To lock it to a login later, set `NEXT_PUBLIC_AUTH_DISABLED=false` and switch the Supabase policy to owner-scoped — magic-link email login is already built in (see `lib/supabase/config.ts` and the commented policy in `supabase/schema-full.sql`).
- **Your data is your own.** You and Micah use separate Supabase projects, so nothing is shared between you.
- **The verse card** on the dashboard uses the New Living Translation with its required attribution — please leave the attribution text in place, or remove the card if you'd rather not have it.
- **Stuck?** Open the folder in Claude Code and describe what's happening — it can read this file and your errors and walk you through it.

Enjoy your CRM! 💕
