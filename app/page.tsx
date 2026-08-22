import { AccessGate } from "@/components/campus/access-gate"
import { SessionProvider } from "@/components/campus/session-provider"
import { AuthGate } from "@/components/campus/auth-gate"

export default function Page() {
  return (
    <AccessGate>
      <SessionProvider>
        <AuthGate />
      </SessionProvider>
    </AccessGate>
  )
}
