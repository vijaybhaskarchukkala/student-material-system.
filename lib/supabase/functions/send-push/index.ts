// Supabase Edge Function: send-push
//
// A Supabase Database Webhook calls this automatically whenever a new row
// is inserted into "announcements", "complaints", or "faculty_complaints".
// It works out the category (Alert / Broadcast / Review) and who should be
// notified, then sends each of their browsers a real push notification —
// shows up as a system notification with sound, even with the site closed,
// and deep-links back into the app when tapped.
//
// Deploy with:  supabase functions deploy send-push
//
// Required secrets (set with `supabase secrets set NAME=value`):
//   VAPID_PUBLIC_KEY
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT               (e.g. mailto:you@example.com)
//   ADMIN_EMAIL                 (same super-admin email as lib/supabase/config.ts)
//   SITE_URL                    (e.g. https://your-app.vercel.app — used for deep links)
//   SUPABASE_URL                (already provided automatically)
//   SUPABASE_SERVICE_ROLE_KEY   (already provided automatically)

import webpush from "npm:web-push@3.6.7"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com"
const ADMIN_EMAIL = (Deno.env.get("ADMIN_EMAIL") ?? "").toLowerCase()
const SITE_URL = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "")
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const table = payload.table as string
    const record = payload.record as Record<string, any>

    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let targetUserIds: string[] = []
    let title = "New notification"
    let deepLinkPath = "/"
    const rawText: string = (record.message ?? record.title ?? "").toString()
    const body = rawText.slice(0, 150)

    if (table === "announcements") {
      deepLinkPath = "/?tab=notifications"
      if (record.target_audience === "faculty_admin") {
        // Broadcast — faculty + admin only.
        title = "You have a broadcast"
        const { data: staff } = await client.from("profiles").select("id").eq("role", "faculty")
        const { data: admin } = await client
          .from("profiles")
          .select("id")
          .ilike("email", ADMIN_EMAIL)
          .maybeSingle()
        targetUserIds = [...(staff ?? []).map((s: any) => s.id), ...(admin ? [admin.id] : [])]
      } else {
        // Alert — everyone.
        title = "You have an alert"
        const { data: all } = await client.from("profiles").select("id")
        targetUserIds = (all ?? []).map((s: any) => s.id)
      }
    } else if (table === "complaints") {
      // A review/feedback message — goes to the admin.
      title = "You have a review"
      const { data: admin } = await client
        .from("profiles")
        .select("id")
        .ilike("email", ADMIN_EMAIL)
        .maybeSingle()
      if (admin) targetUserIds = [admin.id]
    } else if (table === "faculty_complaints") {
      // A review/complaint targeted at specific faculty members.
      title = "You have a review"
      targetUserIds = Array.isArray(record.target_faculty_ids) ? record.target_faculty_ids : []
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ skipped: "no recipients" }), { status: 200 })
    }

    const { data: subs } = await client
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", targetUserIds)

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ skipped: "no subscriptions" }), { status: 200 })
    }

    const payloadStr = JSON.stringify({
      title,
      body,
      url: `${SITE_URL}${deepLinkPath}`,
    })

    const results = await Promise.allSettled(
      subs.map((s: any) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payloadStr,
        ),
      ),
    )

    // Clean up subscriptions that are no longer valid (permission revoked, etc.)
    const expired = subs.filter((_: any, i: number) => {
      const r = results[i]
      return r.status === "rejected" && (r.reason?.statusCode === 404 || r.reason?.statusCode === 410)
    })
    if (expired.length > 0) {
      await client.from("push_subscriptions").delete().in(
        "endpoint",
        expired.map((s: any) => s.endpoint),
      )
    }

    return new Response(JSON.stringify({ sent: subs.length, category: title }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
