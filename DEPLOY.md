# Habesha Exchange — Vercel Deployment Guide

This guide will get your site live and working on Vercel with account creation, login, and the admin panel.

---

## Why it wasn't working

The app was using **SQLite** (a local file database) which does NOT work on Vercel — Vercel's serverless platform has no persistent filesystem. We've now switched to **PostgreSQL**, which works perfectly on Vercel.

---

## Step 1: Create a PostgreSQL Database on Vercel

1. Go to your project on **[vercel.com](https://vercel.com)**
2. Click the **Storage** tab
3. Click **Create Database**
4. Select **Postgres (Neon)** — the free tier
5. Name it `habesha-db` (or anything you like)
6. Click **Create**
7. Click **Connect Project** to link the database to your project

> When you connect a Vercel Postgres database, Vercel **automatically** sets these environment variables: `POSTGRES_PRISMA_URL` (pooled, for app queries) and `POSTGRES_URL_NON_POOLING` (for migrations). The app is configured to use these — **you do NOT need to set `DATABASE_URL`**.

---

## Step 2: Add the remaining Environment Variables

In your Vercel project:

1. Go to **Settings → Environment Variables**
2. Add each of these (click **Add New** for each one):

| Name | Value | Environment |
|------|-------|-------------|
| `JWT_SECRET` | (any long random string, e.g. `habesha-secret-9f8e7d6c5b4a329876543210abcdef`) | Production, Preview, Development |
| `NEXT_PUBLIC_ADMIN_EMAIL` | `amareeyob533@gmail.com` | Production, Preview, Development |
| `NEXT_PUBLIC_WHATSAPP` | `+251900000000` (your real WhatsApp number) | Production, Preview, Development |
| `NEXT_PUBLIC_BASE_URL` | `https://your-app-name.vercel.app` (your Vercel domain) | Production, Preview, Development |

> **Important:** `NEXT_PUBLIC_*` variables must be set BEFORE building. If you add them after the first deploy, you'll need to redeploy.

---

## Step 3: Push the updated code to GitHub

Using **GitHub Desktop**:

1. Open GitHub Desktop
2. You should see changed files (the database switch we just made)
3. Write a commit message like "Switch to PostgreSQL for Vercel deployment"
4. Click **Commit to main**
5. Click **Push origin** (push to GitHub)

Vercel will automatically detect the push and start building.

---

## Step 4: Wait for the build to finish

1. Go to your Vercel project dashboard
2. Watch the **Deployments** tab — you'll see a new build in progress
3. The build runs `prisma generate && prisma db push && next build` — this **automatically creates all database tables** on the first deploy
4. Wait until the status shows **Ready** (green checkmark) — this takes about 1-2 minutes

> If the build fails, check the build logs. The most common issue is `DATABASE_URL` not being set — go back to Step 1 and make sure the database is connected to your project.

---

## Step 5: Create your Admin account

Once the site is live:

1. Open your Vercel URL (e.g. `https://your-app-name.vercel.app`)
2. Click **Get Started** (Sign Up)
3. Fill in:
   - **Full Name:** Your name
   - **Username:** choose a unique username (e.g. `amarey2026`)
   - **Email:** `amareeyob533@gmail.com` ← **MUST use this email** (it's the admin email)
   - **Password:** choose a strong password
4. Click **Create Account**
5. You're now logged in as **admin** — the "Admin · Approvals" item will appear in your sidebar

> The site automatically detects `amareeyob533@gmail.com` as the admin account. Anyone who signs up with a different email is a regular user.

---

## Step 6: Test that everything works

1. **Create a regular user** — sign up with a different email (e.g. open in a private/incognito window)
2. **Make a deposit** as the regular user → it shows as "Pending"
3. **Log in as admin** (`amareeyob533@gmail.com`) → go to **Admin · Approvals → Deposits** → approve it
4. The regular user's balance should update

---

## Troubleshooting

### "Database connection error" or signup fails
- Make sure the Vercel Postgres database is **connected** to your project (Storage tab → the database should show "Connected to [project name]")
- Verify these env vars exist in Settings → Environment Variables: `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` (Vercel auto-sets these when you connect the database)
- If they're missing, go to Storage tab → click your database → **Connect Project** → select your project

### "Environment variable not found: POSTGRES_URL_NON_POOLING" (or POSTGRES_PRISMA_URL)
Some Vercel Postgres setups don't set all the env vars Prisma expects. The build now auto-handles this: `scripts/build.mjs` fills in any missing Postgres env vars from whichever ones ARE set, so the build never fails on a missing var. As long as at least ONE of these is set, the build works:
- `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_URL`, or `DATABASE_URL`

If you still see this error, it means NONE of those are set — the database isn't connected:
1. Vercel project → **Storage** tab → click your Postgres database → **Connect Project** → select your project
2. Verify in **Settings → Environment Variables** that at least `POSTGRES_PRISMA_URL` appears
3. Redeploy

### "Error validating datasource `db`: the URL must start with the protocol `postgresql://` or `postgres://`"
This means Prisma can't find a valid Postgres URL. You need to connect a Vercel Postgres database:
1. Vercel project → **Storage** tab → **Create Database** → **Postgres (Neon)**
2. Click **Connect Project** → select your project
3. This auto-creates `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`
4. Redeploy (Deployments tab → click the latest → **Redeploy**)

### "EROFS: read-only file system" during KYC upload (camera/video)
Vercel's serverless filesystem is read-only, so the app cannot write uploaded files to `/public`. The app handles this automatically in two ways:
- **Default (zero config):** KYC videos/photos are stored as base64 in the `KycMedia` database table and served via `/api/kyc/media?id=...`. This works with no extra setup — KYC just works.
- **Recommended for production (larger files, faster):** Add Vercel Blob storage:
  1. Vercel project → **Storage** tab → **Create Database** → **Blob**
  2. Click **Connect Project** → this auto-sets `BLOB_READ_WRITE_TOKEN`
  3. Redeploy. The app auto-detects the token and uses Blob for KYC uploads.

> The camera records at a low bitrate (~1.5 Mbps, ~750KB per 4-second clip), so even the zero-config database fallback works fine for KYC.

### Build fails with "Environment variable not found"
- All `NEXT_PUBLIC_*` variables must be set in Vercel's Environment Variables BEFORE building
- After adding them, trigger a new deploy (Deployments tab → Redeploy)

### Admin panel not visible
- You must sign up with the exact email `amareeyob533@gmail.com`
- The admin detection is case-insensitive, but the email must match exactly

### Can't log in after signing up
- Check that `JWT_SECRET` is set in Vercel's Environment Variables
- The JWT secret must be the same across builds (don't change it between deploys or users get logged out)

### Email notifications not sending
- Email sending requires SMTP credentials. Add these environment variables for real email:
  - `SMTP_HOST` (e.g. `smtp.gmail.com`)
  - `SMTP_PORT` (e.g. `587`)
  - `SMTP_USER` (your email)
  - `SMTP_PASS` (your app password)
  - `SMTP_FROM` (e.g. `"Habesha Exchange" <amareeyob533@gmail.com>`)
- Without SMTP, deposit/KYC emails log to the server console instead of sending. The in-app admin panel works regardless.

---

## Environment Variables Summary

Set these in Vercel → Settings → Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PRISMA_URL` | ✅ Auto-set by Vercel Postgres | Pooled connection for app queries |
| `POSTGRES_URL_NON_POOLING` | ✅ Auto-set by Vercel Postgres | Direct connection for migrations |
| `JWT_SECRET` | ✅ | Any long random string for session security |
| `NEXT_PUBLIC_ADMIN_EMAIL` | ✅ | `amareeyob533@gmail.com` (your admin email) |
| `NEXT_PUBLIC_WHATSAPP` | ✅ | Your WhatsApp contact number |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Your Vercel app URL (for email links) |
| `SMTP_HOST` | Optional | For sending real emails |
| `SMTP_PORT` | Optional | For sending real emails |
| `SMTP_USER` | Optional | For sending real emails |
| `SMTP_PASS` | Optional | For sending real emails |
| `SMTP_FROM` | Optional | For sending real emails |

> **Note:** If you're using a different Postgres provider (Supabase, Neon directly, Railway) instead of Vercel Postgres, set `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` manually to your database connection strings (both can be the same value).

---

## Important notes

- **Local development:** After this change, the app requires a PostgreSQL database to run locally. The sandbox Preview Panel uses SQLite and will no longer work for testing. Test on your live Vercel URL instead.
- **Database backups:** Vercel Postgres free tier includes automatic backups. For production with real users, consider upgrading.
- **Don't change `JWT_SECRET`** after users have signed up — it will log everyone out.
- **Schema changes:** If you add new database fields in the future, the build automatically syncs the schema via `prisma db push`.
