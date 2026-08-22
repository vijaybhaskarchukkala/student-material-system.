"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Heart, CheckCircle2, Bell, Clock, Megaphone, Trash2 } from "lucide-react"
import { formatPrice, type Item } from "@/lib/campus-data"
import { getSupabase } from "@/lib/supabase/client"

export function NotificationsScreen({ 
  items, 
  currentUserId, 
  isFaculty, 
  isAdmin, 
  userRole 
}: { 
  items: Item[]
  currentUserId: string
  isFaculty?: boolean
  isAdmin?: boolean
  userRole?: string 
}) {
  const { data: announcements } = useSWR("admin-announcements", async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false })
    if (error) throw error
    return data
  }, { refreshInterval: 1000 })

  // Fetch the request rows for MY listings so we can surface the buyer's phone
  // number to the seller. RLS lets the listing owner read these rows.
  const myListingIds = items.filter((i) => i.owner_id === currentUserId).map((i) => i.id)
  const { data: incomingRequestRows } = useSWR(
    myListingIds.length ? ["incoming-requests", currentUserId, myListingIds.join(",")] : null,
    async () => {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from("requests")
        .select("*")
        .in("listing_id", myListingIds)
        .order("created_at", { ascending: false })
      if (error) throw error
      return data ?? []
    },
    { refreshInterval: 5000 },
  )

  // Latest request per listing → { username, phone }.
  const requestByListing = new Map<string, { username: string; phone: string }>()
  for (const r of incomingRequestRows ?? []) {
    if (!requestByListing.has(r.listing_id)) {
      requestByListing.set(r.listing_id, {
        username: r.requester_username ?? "",
        phone: r.requester_phone ?? "",
      })
    }
  }

  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`hidden_announcements_${currentUserId}`)
      if (stored) {
        setHiddenIds(JSON.parse(stored))
      }
    } catch (e) {
      console.error(e)
    }
  }, [currentUserId])

  function handleDismissAnnouncement(id: string) {
    const updated = [...hiddenIds, id]
    setHiddenIds(updated)
    try {
      localStorage.setItem(`hidden_announcements_${currentUserId}`, JSON.stringify(updated))
    } catch (e) {
      console.error(e)
    }
  }

  // బ్రాడ్‌కాస్ట్ డిలీట్ చేయడానికి సరికొత్త లాజిక్
  async function handleDeleteAnnouncement(ann: any) {
    // పోస్ట్ క్రియేట్ చేసిన వ్యక్తి లేదా అడ్మిన్ కాదా అని చెక్ చేయడం
    const isCreator = ann.user_id === currentUserId || ann.username === currentUserId || isAdmin;

    if (isCreator) {
      // క్రియేటర్ అయితే రెండు ఆప్షన్లు అడగడం
      const confirmDeleteEveryone = window.confirm(
        "Delete Options:\n\nClick 'OK' to Delete from Everyone (Permanent for all).\nClick 'Cancel' to Delete from Me only (Hide from your screen)."
      );

      if (confirmDeleteEveryone) {
        // డేటాబేస్ నుంచి పూర్తిగా డిలీట్ చేయడం (Delete from Everyone)
        const supabase = getSupabase();
        const { error } = await supabase.from("announcements").delete().eq("id", ann.id);
        if (error) {
          console.error("Error deleting announcement from database:", error);
          alert("Failed to delete from everyone.");
        }
      } else {
        // కేవలం ఈ యూజర్ స్క్రీన్ నుంచి మాత్రమే హైడ్ చేయడం (Delete from Me)
        handleDismissAnnouncement(ann.id);
      }
    } else {
      // క్రియేటర్ కాని వాళ్లు నొక్కితే కేవలం వారి స్క్రీన్ నుంచి మాత్రమే పోవాలి (Delete from Me)
      handleDismissAnnouncement(ann.id);
    }
  }

  // Someone requested one of MY listings -> alert me.[cite: 2]
  const incomingRequests = items.filter((i) => i.owner_id === currentUserId && i.status === "pending")
  // Listings I requested -> track their status.[cite: 2]
  const myRequests = items.filter((i) => i.requested_by === currentUserId && i.status !== "available")

  const standardNotifications = [
    ...incomingRequests.map((i) => {
      const req = requestByListing.get(i.id)
      const buyer = req?.username ? `@${req.username}` : "A student"
      const contact = req?.phone ? ` You can reach them at +91 ${req.phone}.` : ""
      return {
        id: `incoming-${i.id}`,
        icon: Heart,
        tone: "primary" as const,
        title: "Someone needs your item",
        body: `${buyer} tapped "I Need This" on "${i.title}" (${formatPrice(i.price)}).${contact} Head to My Listings to mark it sold or reset it.`,
      }
    }),
    ...myRequests.map((i) => ({
      id: `mine-${i.id}`,
      icon: i.status === "sold" ? CheckCircle2 : Clock,
      tone: "accent" as const,
      title: i.status === "sold" ? "Item marked as sold" : "Request pending",
      body:
        i.status === "sold"
          ? `"${i.title}" was marked sold by @${i.owner_username}. Arrange the handover on campus.`
          : `You requested "${i.title}" from @${i.owner_username}. Waiting on the owner to confirm.`,
    })),
  ]

  // Broadcast announcements & normal announcements filtering
  const canSeeBroadcasts = isAdmin || isFaculty

  const visibleAnnouncements = (announcements ?? []).filter((ann) => {
    if (hiddenIds.includes(ann.id)) return false;
    if (ann.target_audience === "faculty_admin") {
      return canSeeBroadcasts;
    }
    return true;
  })

  const hasAnyNotifications = visibleAnnouncements.length > 0 || standardNotifications.length > 0

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 bg-background/85 px-5 pb-3 pt-5 backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Notifications</h1>
        <p className="text-xs text-muted-foreground">Requests on your items and updates on your requests.[cite: 2]</p>
      </header>

      {!hasAnyNotifications ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Bell className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No notifications yet</p>
          <p className="max-w-[240px] text-xs text-muted-foreground">
            When someone requests your item or an owner responds to your request, it&apos;ll show up here.[cite: 2]
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 px-5 pb-32 pt-2">
          {/* Broadcast Announcements & Normal Announcements */}
          {visibleAnnouncements.map((ann) => {
            const senderRole = ann.sender_role || (ann.username === "admin" ? "admin" : "faculty")
            const senderName = ann.username || "Admin"
            const isBroadcast = ann.target_audience === "faculty_admin"

            return (
              <div key={ann.id} className="flex gap-3 rounded-2xl border border-primary/40 bg-card p-3.5 shadow-sm relative">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Megaphone className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 pr-6">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{ann.title}</p>
                    {isBroadcast && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">Broadcast</span>
                    )}
                  </div>
                  
                  <p className="mt-1 text-xs font-medium text-foreground">
                    You have a message on Broadcast by @{senderName}
                  </p>
                  
                  <div className="mt-1 flex items-center gap-1.5">
                    {senderRole.toLowerCase() === "faculty" ? (
                      <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-bold text-black shadow-sm">
                        faculty
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-black shadow-sm">
                        admin
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{ann.message}</p>
                  
                  {ann.image_url && (
                    <img
                      src={ann.image_url}
                      alt="Announcement attachment"
                      className="mt-2.5 h-36 w-full rounded-xl object-cover"
                    />
                  )}

                  {ann.link_url && (
                    <a
                      href={ann.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-flex items-center rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-sm"
                    >
                      {ann.link_text || "View"} →
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAnnouncement(ann)}
                  aria-label="Delete notification"
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}

          {/* Standard Activity Notifications[cite: 2] */}
          {standardNotifications.map((n) => {
            const Icon = n.icon
            return (
              <div key={n.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                <span
                  className={
                    n.tone === "primary"
                      ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                      : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-foreground"
                  }
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-card-foreground">{n.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
