"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { createProfile } from "@/lib/api"
import { PhoneShell } from "./phone-shell"

export function OnboardingModal({ user, onDone }: { user: User; onDone: () => void }) {
  const suggested = (user.user_metadata?.name as string | undefined)?.split(" ")[0] ?? ""
  const [username, setUsername] = useState(suggested)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = username.trim().length >= 3

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await createProfile(user.id, user.email ?? "", username)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your username. Please try again.")
      setSaving(false)
    }
  }

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col justify-center px-7">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <UserPlus className="size-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Choose a username</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            This is how other students will see you across Student Material System. You can change it later in settings.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="username" className="text-sm font-semibold">
            Username
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) handleSave()
            }}
            placeholder="e.g. vijay_b"
            maxLength={24}
            autoFocus
            className="input"
          />
          <p className="text-xs text-muted-foreground">At least 3 characters.</p>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className="mt-6 w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity active:scale-[0.99] disabled:opacity-40"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </PhoneShell>
  )
}
