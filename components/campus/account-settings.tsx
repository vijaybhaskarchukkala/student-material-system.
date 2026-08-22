"use client"

import { useState } from "react"
import { X, Pencil, Trash2, AlertTriangle, PhoneCall, Loader2 } from "lucide-react"
import { deleteAccount, updateUsername } from "@/lib/api"
import { getSupabase } from "@/lib/supabase/client"

type View = "menu" | "edit" | "phone" | "delete"

// Strict Indian mobile format: exactly 10 digits, starting 6-9.
const PHONE_RE = /^[6-9]\d{9}$/

export function AccountSettings({
  userId,
  currentUsername,
  currentPhone,
  onClose,
  onUsernameUpdated,
}: {
  userId: string
  currentUsername: string
  currentPhone?: string
  onClose: () => void
  onUsernameUpdated: () => void
}) {
  const [view, setView] = useState<View>("menu")
  const [username, setUsername] = useState(currentUsername)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Phone number state — saved directly, no verification of any kind.
  const [phone, setPhone] = useState((currentPhone ?? "").replace(/\D/g, "").slice(-10))

  async function saveUsername() {
    if (username.trim().length < 3) return
    setBusy(true)
    setError(null)
    try {
      await updateUsername(userId, username)
      onUsernameUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update username.")
      setBusy(false)
    }
  }

  // Save / update the phone number instantly — no OTP, no SMS, no verification.
  async function savePhone() {
    const digits = phone.replace(/\D/g, "")
    if (!PHONE_RE.test(digits)) {
      setError("Enter a valid 10-digit mobile number (starting 6-9). No spaces or symbols.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const supabase = getSupabase()
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ phone: digits })
        .eq("id", userId)
      if (updateErr) throw updateErr

      onUsernameUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your phone number. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    setBusy(true)
    setError(null)
    try {
      await deleteAccount(userId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your account.")
      setBusy(false)
    }
  }

  function openPhone() {
    setError(null)
    setView("phone")
  }

  return (
    <Overlay onClose={onClose}>
      {view === "menu" && (
        <>
          <h2 className="mb-4 text-lg font-bold text-foreground">Account settings</h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <button
              type="button"
              onClick={() => setView("edit")}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left"
            >
              <Pencil className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium text-foreground">Edit Username</span>
            </button>
            <button
              type="button"
              onClick={openPhone}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 text-left"
            >
              <PhoneCall className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium text-foreground">
                {currentPhone ? "Update Phone Number" : "Add Phone Number"}
              </span>
              {currentPhone && (
                <span className="text-xs font-medium text-muted-foreground">+91 {currentPhone}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setView("delete")}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <Trash2 className="h-5 w-5 text-destructive" />
              <span className="flex-1 text-sm font-medium text-destructive">Delete Account</span>
            </button>
          </div>
        </>
      )}

      {view === "edit" && (
        <>
          <h2 className="mb-4 text-lg font-bold text-foreground">Edit Username</h2>
          <label htmlFor="new-username" className="text-sm font-semibold text-foreground">
            Username
          </label>
          <input
            id="new-username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              if (error) setError(null)
            }}
            maxLength={24}
            autoFocus
            className="input mt-2"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setView("menu")}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground"
            >
              Back
            </button>
            <button
              type="button"
              onClick={saveUsername}
              disabled={username.trim().length < 3 || busy}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}

      {view === "phone" && (
        <>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PhoneCall className="size-5" />
            </span>
            <h2 className="text-lg font-bold text-foreground">
              {currentPhone ? "Update mobile number" : "Add mobile number"}
            </h2>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Add or update your mobile number so buyers and sellers can reach you. It saves instantly — no
            verification required.
          </p>
          <label htmlFor="new-phone" className="text-sm font-semibold text-foreground">
            Mobile number
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3">
            <span className="text-sm font-semibold text-muted-foreground">+91</span>
            <input
              id="new-phone"
              type="tel"
              inputMode="numeric"
              placeholder="10-digit number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                if (error) setError(null)
              }}
              autoFocus
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setView("menu")}
              className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold text-foreground"
            >
              Back
            </button>
            <button
              type="button"
              onClick={savePhone}
              disabled={!PHONE_RE.test(phone) || busy}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Saving…" : "Save Number"}
            </button>
          </div>
        </>
      )}

      {view === "delete" && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" />
            </span>
            <h2 className="text-lg font-bold text-foreground">Delete account?</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            This permanently wipes your profile, every listing you&apos;ve created, your requests and reviews, and your
            sign-in account from the database, then logs you out. This cannot be undone.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={confirmDelete}
              disabled={busy}
              className="w-full rounded-xl bg-destructive py-3.5 text-sm font-bold text-destructive-foreground disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete account permanently"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="w-full rounded-xl border border-border py-3.5 text-sm font-semibold text-foreground"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </Overlay>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-foreground/40 p-3" onClick={onClose}>
      <div
        className="relative w-full rounded-3xl bg-background p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  )
}
