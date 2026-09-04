import { AccessGate } from "@/components/campus/access-gate"
import { SessionProvider } from "@/components/campus/session-provider"
import { AuthGate } from "@/components/campus/auth-gate"
import { PushNotificationInit } from "@/components/campus/push-notification-init"

export default function Page() {
  return (
    <AccessGate>
      <SessionProvider>
        <PushNotificationInit />
        <AuthGate />
      </SessionProvider>
    </AccessGate>
  )
}
