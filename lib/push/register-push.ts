"use client"

import { getSupabase } from "@/lib/supabase/client"

// Public VAPID key — safe to expose in client code (it's the "address"
// notifications are sent to, not a secret). Set in Vercel project settings
// as NEXT_PUBLIC_VAPID_PUBLIC_KEY, or it falls back to the value below.
const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
  "BM1ShRmXAwz6qZYv2MYyKXrsaO0tJ46zYNEiL_WhRTOUpIuxEwN847WsE0jjDkkSUdX-6qE0mJYpH6VjMYrTGm8"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

/**
 * Asks the browser for notification permission and subscribes this device
 * to push notifications, saving the subscription against the logged-in
 * user so the server knows where to deliver alerts/broadcasts/reviews.
 *
 * Safe to call for every logged-in user — students get "Alerts" only,
 * faculty/admin also get "Broadcasts" and "Reviews" (decided server-side).
 */
export async function subscribeToPush(userId: string) {
  if (typeof window === "undefined") return
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

  try {
    const registration = await navigator.serviceWorker.register("/sw.js")

    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") return

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return

    const supabase = getSupabase()
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      { onConflict: "endpoint" },
    )
    if (error) console.error("Failed to save push subscription:", error)
  } catch (err) {
    console.error("Push subscription failed:", err)
  }
}
