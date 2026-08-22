"use client"

import { Home, ListChecks, Plus, Bell, User } from "lucide-react"
import { cn } from "@/lib/utils"

export type Tab = "home" | "listings" | "post" | "notifications" | "profile"

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "listings", label: "Listings", icon: ListChecks },
  { id: "post", label: "Post", icon: Plus },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "profile", label: "Profile", icon: User },
]

export function BottomNav({
  active,
  onChange,
  notificationCount,
}: {
  active: Tab
  onChange: (tab: Tab) => void
  notificationCount: number
}) {
  return (
    <nav
      aria-label="Primary"
      className="absolute inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-md"
    >
      <ul className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => {
          const isPost = tab.id === "post"
          const isActive = active === tab.id
          const Icon = tab.icon

          if (isPost) {
            return (
              <li key={tab.id} className="flex flex-1 items-start justify-center">
                <button
                  type="button"
                  onClick={() => onChange(tab.id)}
                  aria-label="Post an item"
                  className="-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-card transition-transform active:scale-95"
                >
                  <Icon className="h-6 w-6" strokeWidth={2.5} />
                </button>
              </li>
            )
          }

          return (
            <li key={tab.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  {tab.id === "notifications" && notificationCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
                      {notificationCount}
                    </span>
                  )}
                </span>
                {tab.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
