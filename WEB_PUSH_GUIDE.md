# Chrome System Notifications — Setup Guide

Cost: ₹0. No APK, no Firebase, no Android Studio.

## What this does

| Category | Who gets it | Notification shown |
|---|---|---|
| **Alerts** (announcement sent to "All Users") | Everyone (students + faculty + admin) | "You have an alert" + the alert text |
| **Broadcasts** (announcement sent "Only to Faculty and Admin") | Faculty + Admin only | "You have a broadcast" + the broadcast text |
| **Reviews** (Feedback & Complaints submissions) | Admin (all categories) + the specific faculty selected for "Complaint to Faculty" | "You have a review" + the review text |

Tapping any notification opens the web app straight away (Alerts/Broadcasts land on the Alerts tab).

## Step 1 — Files in your repo

| File | Repo path |
|---|---|
| `sw.js` | `public/sw.js` |
| `register-push.ts` | `lib/push/register-push.ts` |
| `push-notification-init.tsx` | `components/campus/push-notification-init.tsx` |
| `page.tsx` | `app/page.tsx` (replace) |
| `campus-app.tsx` | `components/campus/campus-app.tsx` (replace — adds deep-link tab support) |
| `setup-4-push-subscriptions.sql` | run in Supabase SQL Editor |
| `send-push-index.ts` | `supabase/functions/send-push/index.ts` (rename) |

## Step 2 — Vercel environment variable

Vercel Dashboard → your Project → Settings → Environment Variables → Add:

```
Name:  NEXT_PUBLIC_VAPID_PUBLIC_KEY
Value: BM1ShRmXAwz6qZYv2MYyKXrsaO0tJ46zYNEiL_WhRTOUpIuxEwN847WsE0jjDkkSUdX-6qE0mJYpH6VjMYrTGm8
```

Save → Deployments tab → latest → "..." → Redeploy.

## Step 3 — Database table

Supabase Dashboard → SQL Editor → paste all of `setup-4-push-subscriptions.sql` → Run.

## Step 4 — Deploy the sending function

Terminal (inside your repo folder):

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your Supabase project ref — Settings → General>
supabase functions deploy send-push
```

Then set these secrets (keep them private):

```bash
supabase secrets set VAPID_PUBLIC_KEY=BM1ShRmXAwz6qZYv2MYyKXrsaO0tJ46zYNEiL_WhRTOUpIuxEwN847WsE0jjDkkSUdX-6qE0mJYpH6VjMYrTGm8
supabase secrets set VAPID_PRIVATE_KEY=2IO2VvTIPUkVtlAzoKz96ZbLKodwjnVDaxOBCmcnXM4
supabase secrets set VAPID_SUBJECT=mailto:vijaybhaskar.ch9045@gmail.com
supabase secrets set ADMIN_EMAIL=vijaybhaskar.ch9045@gmail.com
supabase secrets set SITE_URL=https://your-app.vercel.app
```

(First two keys are already generated for you — no need to make new ones. Replace `SITE_URL` with your real Vercel URL.)

## Step 5 — Wire up the Database Webhooks (this is the trigger)

Supabase Dashboard → Database → **Webhooks** → "Create a new hook", 3 times:

| Table | Event | Type | Target |
|---|---|---|---|
| `announcements` | Insert | Edge Function | `send-push` |
| `complaints` | Insert | Edge Function | `send-push` |
| `faculty_complaints` | Insert | Edge Function | `send-push` |

## Test

1. Open the site as a student → a browser popup asks "Allow notifications?" → tap **Allow**.
2. From an admin account, send an announcement to "All Users".
3. Even with the student's tab/browser closed, a system notification with sound should appear within a few seconds. Tapping it opens the app on the Alerts tab.
4. Repeat as faculty/admin for a Broadcast and a Review (complaint) to confirm those too.

## Notes

- Works on Chrome/Edge/Firefox on Android and desktop out of the box.
- On iPhone (Safari), the user must "Add to Home Screen" first for push to work — this is a free, one-tap step, not an APK.
- If a user taps "Block" instead of "Allow", they simply won't get notifications until they manually re-enable it from the browser's site settings — that's expected browser behaviour, not something the app can override.
