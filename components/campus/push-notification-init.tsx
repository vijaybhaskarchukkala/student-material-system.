"use client"

import { useEffect } from "react"
import { useSession } from "./session-provider"
import { subscribeToPush } from "@/lib/push/register-push"

/**
 * Renders nothing. Silently asks for notification permission and
 * subscribes this device to push, for every logged-in user — students
 * receive Alerts, faculty/admin also receive Broadcasts and Reviews
 * (that targeting decision happens server-side, not here).
 */
export function PushNotificationInit() {
  const { user } = useSession()

  useEffect(() => {
    if (user?.id) {
      void subscribeToPush(user.id)
    }
  }, [user?.id])

  return null
}
