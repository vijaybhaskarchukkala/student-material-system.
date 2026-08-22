"use client"

import { useState } from "react"
import {
  ListChecks,
  Clock,
  CheckCircle2,
  Settings,
  MessageSquareHeart,
  ChevronRight,
  ShieldCheck,
  LogOut,
  PhoneCall,
  GraduationCap,
} from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { useSession } from "./session-provider"
import { AccountSettings } from "./account-settings"
import { GiveReview } from "./give-review"
import { AdminDashboard } from "./admin-dashboard"

export function ProfileScreen() {
  const { user, profile, isAdmin, listings, reloadProfile } = useSession()
  const [showSettings, setShowSettings] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showFacultyDash, setShowFacultyDash] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await getSupabase().auth.signOut()
  }

  if (showAdmin) {
    return <AdminDashboard onBack={() => setShowAdmin(false)} />
  }

  if (showFacultyDash) {
    return <AdminDashboard onBack={() => setShowFacultyDash(false)} />
  }

  const userId = user!.id
  const username = profile?.username ?? "student"
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null
  
  const phoneNumber = (profile as any)?.phone || (profile as any)?.phone_number || ""

  const userRole = (profile as any)?.role || ""
  const isFaculty = userRole === "faculty"

  const mine = listings.filter((i) => i.owner_id === userId)
  const active = mine.filter((i) => i.status === "available").length
  const pending = mine.filter((i) => i.status === "pending").length
  const sold = profile?.sold_count ?? 0

  const stats = [
    { label: "Active", value: active, icon: ListChecks },
    { label: "Pending", value: pending, icon: Clock },
    { label: "Sold", value: sold, icon: CheckCircle2 },
  ]

  return (
    <div className="flex flex-col">
      <header className="px-5 pb-3 pt-5">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Profile</h1>
      </header>

      <div className="flex flex-col gap-5 px-5 pb-32">
        <section className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          {avatarUrl ? (
            <img
              src={avatarUrl || "/placeholder.svg"}
              alt=""
              className="h-16 w-16 rounded-2xl object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold uppercase text-primary-foreground">
              {username.slice(0, 2)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-foreground">@{username}</p>
            {phoneNumber ? (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <PhoneCall className="h-3.5 w-3.5 text-primary" /> +91 {phoneNumber}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary"
              >
                <PhoneCall className="h-3.5 w-3.5" /> Add phone number
              </button>
            )}
            
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  <ShieldCheck className="h-3 w-3" />
                  Super-admin
                </span>
              )}
              {isFaculty && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-blue-500">
                  <GraduationCap className="h-3 w-3" />
                  Faculty
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3 shadow-sm"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-foreground">{value}</span>
              <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
            </div>
          ))}
        </section>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowAdmin(true)}
            className="flex items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 text-left text-primary-foreground shadow-lg shadow-primary/25"
          >
            <ShieldCheck className="h-5 w-5" />
            <span className="flex-1 text-sm font-semibold">Admin Dashboard</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {isFaculty && (
          <button
            type="button"
            onClick={() => setShowFacultyDash(true)}
            className="flex items-center gap-3 rounded-2xl bg-blue-600 px-4 py-3.5 text-left text-white shadow-lg shadow-blue-600/25"
          >
            <GraduationCap className="h-5 w-5" />
            <span className="flex-1 text-sm font-semibold">Faculty Dashboard</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <MenuButton icon={Settings} label="Account settings" onClick={() => setShowSettings(true)} />
          <MenuButton icon={MessageSquareHeart} label="Give Review or Complaint on any User" onClick={() => setShowReview(true)} last />
        </section>
        <p className="text-xs text-muted-foreground px-1 -mt-3 leading-relaxed">
          Hint: You can give complaint on any user and it is private and viewable only by the admin.
        </p>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-sm transition-colors hover:bg-secondary disabled:opacity-60"
        >
          <LogOut className="h-5 w-5 text-destructive" />
          <span className="flex-1 text-sm font-semibold text-destructive">
            {loggingOut ? "Logging out…" : "Logout"}
          </span>
        </button>
      </div>

      {showSettings && (
        <AccountSettings
          userId={userId}
          currentUsername={username}
          currentPhone={phoneNumber}
          onClose={() => setShowSettings(false)}
          onUsernameUpdated={reloadProfile}
        />
      )}
      {showReview && <GiveReview userId={userId} username={username} onClose={() => setShowReview(false)} />}
    </div>
  )
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  last,
}: {
  icon: typeof Settings
  label: string
  onClick: () => void
  last?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${last ? "" : "border-b border-border"}`}
    >
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  )
}
