"use client"

import { useState, useEffect } from "react"
import { Ban, Loader2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { useSession } from "./session-provider"
import { LoginScreen } from "./login-screen"
import { OnboardingModal } from "./onboarding-modal"
import { CampusApp } from "./campus-app"
import { PhoneShell } from "./phone-shell"

export function AuthGate() {
  const { loading, user, profile, reloadProfile } = useSession()
  const [isReady, setIsReady] = useState(false)

  // డేటా పూర్తిగా సింక్ అయ్యే వరకు కొద్దిసేపు (ఉదాహరణకు 600ms) కస్టమ్ లోడింగ్ స్క్రీన్ ఉంచుతాం
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 600) // ఈ టైమ్‌ని మీ అవసరాన్ని బట్టి పెంచుకోవచ్చు లేదా తగ్గించుకోవచ్చు
      return () => clearTimeout(timer)
    }
  }, [loading])

  // సెషన్ లోడ్ అవుతున్నా లేదా ప్రొఫైల్ చెక్ జరుగుతున్నా - ఆ యూజర్‌నేమ్ స్క్రీన్ కనిపించకుండా కేవలం లోడింగ్/వీడియో స్క్రీన్ మాత్రమే వస్తుంది
  if (loading || !isReady || (user && profile === undefined)) {
    return (
      <PhoneShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-black text-white">
          {/* ఇక్కడ మీరు కావాలంటే లోడింగ్ వీడియో లేదా మీ లోగో పెట్టుకోవచ్చు */}
          <div className="relative flex size-20 items-center justify-center rounded-2xl bg-white/10 shadow-2xl animate-pulse">
            <span className="text-2xl font-bold">SMS</span>
          </div>
          <Loader2 className="size-6 animate-spin text-zinc-400" aria-label="Loading" />
          <p className="text-xs text-zinc-400 tracking-wider">Loading your Student Material System.........</p>
        </div>
      </PhoneShell>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  // నిజంగానే ప్రొఫైల్ లేకపోతేనే (అంటే కొత్త యూజర్ అయితేనే) ఆన్-బోర్డింగ్ వస్తుంది
  if (profile === null) {
    return <OnboardingModal user={user} onDone={reloadProfile} />
  }

  if (profile.is_banned) {
    return <BannedScreen />
  }

  return <CampusApp />
}

function BannedScreen() {
  async function signOut() {
    await getSupabase().auth.signOut()
  }
  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Ban className="size-8" aria-hidden />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Account suspended</h1>
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
          Your access to Student Material System has been blocked by an administrator. If you believe this is a mistake,contact your 
          Super-admin.
        </p>
        <button
          type="button"
          onClick={signOut}
          className="mt-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground"
        >
          Sign out
        </button>
      </div>
    </PhoneShell>
  )
}
