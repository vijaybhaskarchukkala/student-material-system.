"use client"

import { useMemo, useState } from "react"
import type { Category, Item } from "@/lib/campus-data"
import {
  createListing,
  deleteListing,
  markSold,
  requestListing,
  resetToAvailable,
} from "@/lib/api"
import { useSession } from "./session-provider"
import { BottomNav, type Tab } from "./bottom-nav"
import { HomeScreen } from "./home-screen"
import { ProductDetail } from "./product-detail"
import { PostItem } from "./post-item"
import { MyListings } from "./my-listings"
import { NotificationsScreen } from "./notifications-screen"
import { ProfileScreen } from "./profile-screen"

export function CampusApp() {
  const { user, profile, isAdmin, listings, reloadListings, reloadProfile } = useSession()
  const [tab, setTab] = useState<Tab>("home")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showPhoneWarning, setShowPhoneWarning] = useState(false)

  const userId = user!.id
  const username = profile?.username ?? "student"
  const userPhone = (profile as any)?.phone || (profile as any)?.phone_number || ""
  const isFaculty = profile?.role === "faculty"

  // Always derive the selected item from the live list so its status stays fresh.
  const selected = useMemo(
    () => (selectedId ? listings.find((i) => i.id === selectedId) ?? null : null),
    [selectedId, listings],
  )

  const notificationCount = 0

  function openItem(item: Item) {
    setSelectedId(item.id)
  }

  async function handleRequest(item: Item) {
    if (!userPhone) {
      setShowPhoneWarning(true)
      return
    }
    await requestListing(item, userId, username, userPhone)
    reloadListings()
  }

  async function handleMarkSold(item: Item) {
    await markSold(item)
    reloadListings()
    reloadProfile()
  }

  async function handleReset(item: Item) {
    await resetToAvailable(item)
    reloadListings()
  }

  async function handleDelete(item: Item) {
    await deleteListing(item.id)
    setSelectedId(null)
    reloadListings()
  }

  async function handleAdd(data: {
    title: string
    category: Category
    price: number
    image: string
    owner: string
  }) {
    if (!userPhone) {
      setShowPhoneWarning(true)
      return
    }
    await createListing({
      owner_id: userId,
      owner_username: username,
      ...data,
    })
    reloadListings()
    setTab("listings")
  }

  function changeTab(next: Tab) {
    if (next === "post" && !userPhone) {
      setShowPhoneWarning(true)
      return
    }
    setSelectedId(null)
    setTab(next)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted p-0 sm:p-6">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-background shadow-2xl sm:h-[900px] sm:max-h-[92vh] sm:rounded-[2.5rem] sm:border-8 sm:border-foreground/90">
        <div className="scroll-area flex-1 overflow-y-auto overscroll-contain">
          {selected ? (
            <ProductDetail
              item={selected}
              currentUserId={userId}
              isAdmin={isAdmin}
              onBack={() => setSelectedId(null)}
              onRequest={handleRequest}
              onDelete={handleDelete}
            />
          ) : (
            <>
              {tab === "home" && (
                <HomeScreen items={listings} isAdmin={isAdmin} onOpen={openItem} onDelete={handleDelete} />
              )}
              {tab === "listings" && (
                <MyListings
                  items={listings}
                  currentUserId={userId}
                  onMarkSold={handleMarkSold}
                  onReset={handleReset}
                  onOpen={openItem}
                  onPost={() => {
                    if (!userPhone) {
                      setShowPhoneWarning(true)
                      return
                    }
                    changeTab("post")
                  }}
                />
              )}
              {tab === "post" && <PostItem onSubmit={handleAdd} />}
              {tab === "notifications" && (
                <NotificationsScreen 
                  items={listings} 
                  currentUserId={userId} 
                  isAdmin={isAdmin}
                  isFaculty={profile?.role === "faculty"} 
                />
              )}
              {tab === "profile" && <ProfileScreen />}
            </>
          )}
        </div>

        {!selected && <BottomNav active={tab} onChange={changeTab} notificationCount={notificationCount} />}

        {showPhoneWarning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-foreground">Phone Number Required</h3>
                <button
                  type="button"
                  onClick={() => setShowPhoneWarning(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                To make any operations first add your number in profile page or add your number by clicking add phone number button below
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowPhoneWarning(false)
                  localStorage.setItem("open_phone_modal", "true")
                  setSelectedId(null)
                  setTab("profile")
                }}
                className="mt-2 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 active:scale-[0.99]"
              >
                Add phone number
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
