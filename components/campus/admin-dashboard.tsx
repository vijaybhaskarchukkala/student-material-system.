"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { ChevronLeft, Users, MessageSquareWarning, PackageSearch, Ban, ShieldCheck, Trash2, Loader2, Megaphone, Send, Image as ImageIcon, GraduationCap, Radio } from "lucide-react"
import { cn } from "@/lib/utils"
import { deleteListing, fetchAllProfiles, fetchReviews, deleteReview, setBanned, deleteAnnouncement } from "@/lib/api"
import { formatPrice, type Item } from "@/lib/campus-data"
import { useSession } from "./session-provider"
import { getSupabase } from "@/lib/supabase/client"

type AdminTab = "users" | "listings" | "reviews" | "announcements" | "broadcast"

export function AdminDashboard({ onBack }: { onBack: () => void }) {
  const { user, profile, isAdmin, listings, reloadListings } = useSession()
  const [tab, setTab] = useState<AdminTab>("users")

  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState("")
  const [linkText, setLinkText] = useState("View")
  
  const [submitType, setSubmitType] = useState<"all" | "faculty_admin" | null>(null)
  const [hiddenReviewIds, setHiddenReviewIds] = useState<string[]>([])
  const [deleteModalAnn, setDeleteModalAnn] = useState<any | null>(null)
  const [hiddenAnnIds, setHiddenAnnIds] = useState<string[]>([])

  useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`hidden_reviews_${user.id}`)
      if (saved) {
        try {
          setHiddenReviewIds(JSON.parse(saved))
        } catch (e) {
          console.error(e)
        }
      }
      const savedAnn = localStorage.getItem(`hidden_announcements_${user.id}`)
      if (savedAnn) {
        try { setHiddenAnnIds(JSON.parse(savedAnn)) } catch(e) {}
      }
    }
  }, [user?.id])

  const { data: profiles, mutate: reloadProfiles, isLoading: profilesLoading } = useSWR("admin-profiles", fetchAllProfiles)
  const { data: reviews, isLoading: reviewsLoading } = useSWR("admin-reviews", fetchReviews)
  const { data: announcements, mutate: reloadAnnouncements, isLoading: announcementsLoading } = useSWR("admin-announcements", async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false })
    if (error) throw error
    return data
  }, { refreshInterval: 1000 })

  function checkIsSuperAdmin(pEmail?: string | null) {
    if (!pEmail) return false;
    return pEmail.toLowerCase().trim() === "vijaybhaskar.ch9045@gmail.com";
  }

  async function toggleBan(userId: string, banned: boolean) {
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: banned })
        .eq("id", userId)

      if (error) {
        await setBanned(userId, banned)
      }
      void reloadProfiles()
    } catch (err) {
      console.error("Failed to ban/unban user:", err)
      alert("Failed to update user ban status.")
    }
  }

  async function toggleFaculty(userId: string, currentRole: string) {
    if (!isAdmin) {
      alert("You do not have permission to change user roles.")
      return
    }
    const newRole = currentRole === "faculty" ? "user" : "faculty"
    const supabase = getSupabase()
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId)
    if (error) {
      alert("Failed to update role.")
    } else {
      void reloadProfiles()
    }
  }

  async function removeListing(item: Item) {
    const ownerProfile = profiles?.find(p => p.username.toLowerCase() === item.owner_username?.toLowerCase());
    const isSuperAdminOwner = checkIsSuperAdmin(ownerProfile?.email);

    if (!isAdmin && isSuperAdminOwner) {
      alert("You cannot delete listings owned by the Super Admin.")
      return
    }

    if (!confirm(`Delete "${item.title}" permanently?`)) return

    try {
      const supabase = getSupabase()
      const { error } = await supabase.from("listings").delete().eq("id", item.id)
      
      if (error) {
        await deleteListing(item.id)
      }
      reloadListings()
    } catch (err) {
      console.error("Failed to delete listing:", err)
      alert("Failed to delete listing.")
    }
  }

  async function removeReview(reviewId: string) {
    const isSuper = checkIsSuperAdmin(user?.email);

    if (isSuper && confirm("Super Admin: Do you want to delete this permanently from database? (Click Cancel to hide only from your screen)")) {
      try {
        await deleteReview(reviewId)
        window.location.reload()
        return
      } catch (err) {
        console.error("Failed to delete permanently:", err)
      }
    }

    const updated = [...hiddenReviewIds, reviewId]
    setHiddenReviewIds(updated)
    if (user?.id) {
      localStorage.setItem(`hidden_reviews_${user.id}`, JSON.stringify(updated))
    }
  }

  async function handleSendAnnouncement(e: React.FormEvent, audienceType: "all" | "faculty_admin") {
    e.preventDefault()
    if (!message.trim() || submitType !== null) return
    setSubmitType(audienceType)
    
    try {
      const supabase = getSupabase()
      let imageUrl: string | null = null

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop()
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
        const filePath = `announcements/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from("listings")
          .upload(filePath, imageFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from("listings")
          .getPublicUrl(filePath)

        imageUrl = publicUrlData.publicUrl
      }

      const senderName = profile?.username || user?.email?.split("@")[0] || "Admin"
      const finalTitle = title.trim() || (audienceType === "faculty_admin" ? "Broadcast Message" : "Platform Announcement")

      const { error: insertError } = await supabase.from("announcements").insert({
        title: finalTitle,
        message: message.trim(),
        image_url: imageUrl,
        link_url: linkUrl.trim() || null,
        link_text: linkUrl.trim() ? (linkText.trim() || "View") : "View",
        target_audience: audienceType,
        user_id: user?.id,
        username: senderName,
      })

      if (insertError) throw insertError

      setTitle("")
      setMessage("")
      setImageFile(null)
      setLinkUrl("")
      setLinkText("View")
      void reloadAnnouncements()
      alert(audienceType === "faculty_admin" ? "Broadcast sent successfully to Faculty & Admin!" : "Announcement sent successfully to All Users!")
    } catch (err: any) {
      console.error("Detailed error:", err)
      alert(`Failed to send notification: ${err?.message || "Unknown error"}`)
    } finally {
      setSubmitType(null)
    }
  }

  async function handleDeleteChoice(choice: 'everyone' | 'me' | 'cancel', ann: any) {
    setDeleteModalAnn(null);
    if (choice === 'cancel' || !ann) return;

    if (choice === 'everyone') {
      try {
        const supabase = getSupabase();
        const { error } = await supabase.from("announcements").delete().eq("id", ann.id);
        if (error) {
          await deleteAnnouncement(ann.id);
        }
        void reloadAnnouncements();
      } catch (err) {
        console.error("Failed to delete from everyone:", err);
        alert("Failed to delete from everyone.");
      }
    } else if (choice === 'me') {
      const hiddenKey = `hidden_announcements_${user?.id}`;
      const stored = localStorage.getItem(hiddenKey);
      let hiddenArr: string[] = [];
      if (stored) {
        try { hiddenArr = JSON.parse(stored); } catch (e) {}
      }
      if (!hiddenArr.includes(ann.id)) {
        hiddenArr.push(ann.id);
        localStorage.setItem(hiddenKey, JSON.stringify(hiddenArr));
        setHiddenAnnIds([...hiddenArr]);
      }
      void reloadAnnouncements();
    }
  }

  function handleTrashClick(ann: any) {
    const isCreator = ann.user_id === user?.id || ann.username === profile?.username || checkIsSuperAdmin(user?.email) || isAdmin;
    
    if (isCreator) {
      setDeleteModalAnn(ann);
    } else {
      handleDeleteChoice('me', ann);
    }
  }

  const displayedReviews = (reviews ?? []).filter((r) => {
    if (hiddenReviewIds.includes(r.id)) return false;
    if (!isAdmin) {
      return r.category === "Complaint to Faculty";
    }
    return true;
  });

  const normalAnnouncements = (announcements ?? []).filter((ann: any) => ann.target_audience !== "faculty_admin" && !hiddenAnnIds.includes(ann.id));
  const broadcastAnnouncements = (announcements ?? []).filter((ann: any) => ann.target_audience === "faculty_admin" && !hiddenAnnIds.includes(ann.id));
  
  const tabs: { id: AdminTab; label: string; icon: typeof Users }[] = [
    { id: "users", label: "Users", icon: Users },
    { id: "listings", label: "Listings", icon: PackageSearch },
    { id: "reviews", label: "Reviews", icon: MessageSquareWarning },
    { id: "announcements", label: "Announcements", icon: Megaphone },
    { id: "broadcast", label: "Broadcast", icon: Radio },
  ]

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-25 bg-background/85 px-4 pb-3 pt-5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to profile"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isAdmin ? "Admin Dashboard" : "Faculty Dashboard"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAdmin ? "Super-admin controls" : "Faculty management panel"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap",
                tab === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-2.5 px-4 pb-32 pt-2">
        {tab === "users" &&
          (profilesLoading ? (
            <Spinner />
          ) : (
            (profiles ?? []).map((p) => {
              const isMe = p.id === user?.id
              const isFaculty = p.role === "faculty"
              const isSuperAdminTarget = checkIsSuperAdmin(p.email)

              return (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold uppercase text-primary">
                    {p.username.slice(0, 2)}
                  </span>
                  
                  <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                    <p className="truncate text-sm font-semibold text-card-foreground flex items-center gap-1.5">
                      @{p.username}
                      {isMe && <span className="text-[10px] font-medium text-muted-foreground">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                    <p className="text-[11px] text-muted-foreground">{p.sold_count} sold</p>
                    <div className="mt-0.5">
                      {isSuperAdminTarget ? (
                        <span className="inline-block rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                          Super Admin
                        </span>
                      ) : isFaculty ? (
                        <span className="inline-block rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-500">
                          Faculty
                        </span>
                      ) : (
                        <span className="inline-block rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          User
                        </span>
                      )}
                    </div>
                  </div>

                  {!isMe && (
                    <div className="flex items-center gap-1.5">
                      {isAdmin && !isSuperAdminTarget && (
                        <button
                          type="button"
                          onClick={() => toggleFaculty(p.id, p.role)}
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-semibold border",
                            isFaculty ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-secondary"
                          )}
                        >
                          <GraduationCap className="h-4 w-4" />
                          {isFaculty ? "Revoke" : "Make Faculty"}
                        </button>
                      )}

                      {!isSuperAdminTarget && (
                        <button
                          type="button"
                          onClick={() => toggleBan(p.id, !p.is_banned)}
                          className={cn(
                            "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold",
                            p.is_banned
                              ? "border border-border text-foreground"
                              : "bg-destructive text-destructive-foreground",
                          )}
                        >
                          {p.is_banned ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          {p.is_banned ? "Unban" : "Ban"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          ))}

        {tab === "listings" &&
          (listings.length === 0 ? (
            <Empty label="No listings on the platform yet." />
          ) : (
            listings.map((item) => {
              const ownerProfile = profiles?.find(p => p.username.toLowerCase() === item.owner_username?.toLowerCase());
              const isSuperAdminOwner = checkIsSuperAdmin(ownerProfile?.email);
              const isFacultyOwner = ownerProfile?.role === "faculty";

              const ownerRole = isSuperAdminOwner ? "Super Admin" : (isFacultyOwner ? "Faculty" : "User");
              const hideDeleteButton = !isAdmin && isSuperAdminOwner;

              return (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                  <img
                    src={item.image || "/placeholder.svg"}
                    alt={item.title}
                    className="h-14 w-11 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-card-foreground">{item.title}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>@{item.owner_username}</span>
                      <span>·</span>
                      <span className={cn(
                        "rounded px-1.5 py-0.2 text-[10px] font-bold",
                        ownerRole === "Super Admin" ? "bg-amber-500/10 text-amber-500" :
                        ownerRole === "Faculty" ? "bg-blue-500/10 text-blue-500" : "bg-secondary text-muted-foreground"
                      )}>
                        {ownerRole}
                      </span>
                      <span>·</span>
                      <span>{formatPrice(item.price)}</span>
                    </div>
                  </div>
                  
                  {!hideDeleteButton && (
                    <button
                      type="button"
                      onClick={() => removeListing(item)}
                      aria-label="Delete listing"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground hover:opacity-90"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            })
          ))}

        {tab === "reviews" &&
          (reviewsLoading ? (
            <Spinner />
          ) : displayedReviews.length === 0 ? (
            <Empty label={isAdmin ? "No feedback submitted yet." : "No faculty complaints found."} />
          ) : (
            displayedReviews.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-card-foreground">@{r.username}</p>
                    {r.category && (
                      <span className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-bold",
                        r.category === "Complaint to Faculty" ? "bg-purple-500/10 text-purple-500" : "bg-primary/10 text-primary"
                      )}>
                        {r.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.message}</p>
                  <span className="mt-2 block text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeReview(r.id)}
                  aria-label="Delete review"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ))}

        {tab === "announcements" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                Create Announcement
              </h2>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter title"
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                  required
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" /> Attach Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="mt-1 w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Link URL (Optional)</label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Button Text (Optional)</label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="View"
                    disabled={!linkUrl.trim()}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  type="button"
                  disabled={submitType !== null}
                  onClick={(e) => handleSendAnnouncement(e, "all")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black border border-gray-300 hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                >
                  {submitType === "all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send to All Users (Alerts)
                </button>

                <button
                  type="button"
                  disabled={submitType !== null}
                  onClick={(e) => handleSendAnnouncement(e, "faculty_admin")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-black hover:bg-amber-600 disabled:opacity-50 border border-amber-600 shadow-sm"
                >
                  {submitType === "faculty_admin" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                  Send Only to Faculty and Admin (Broadcast)
                </button>
              </div>
            </div>

            <div className="mt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Previous Announcements</h3>
              {announcementsLoading ? (
                <Spinner />
              ) : normalAnnouncements.length === 0 ? (
                <Empty label="No announcements sent yet." />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {normalAnnouncements.map((ann: any) => {
                    const creatorProfile = profiles?.find(p => p.id === ann.user_id || p.username.toLowerCase() === ann.username?.toLowerCase());

                    return (
                      <div key={ann.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm relative group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-card-foreground">{ann.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ann.message}</p>
                            
                            {ann.image_url && (
                              <div className="mt-2.5 w-full overflow-hidden rounded-xl bg-muted/20 flex justify-center">
                                <img
                                  src={ann.image_url}
                                  alt="Announcement attachment"
                                  className="w-full h-auto object-contain rounded-lg max-h-[400px]"
                                />
                              </div>
                            )}

                            {ann.link_url && (
                              <p className="mt-2.5">
                                <a
                                  href={ann.link_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                                >
                                  {ann.link_text || "View"} →
                                </a>
                              </p>
                            )}

                            <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>By: @{creatorProfile?.username || ann.username || "Admin"} ({creatorProfile?.role || "admin"})</span>
                              <span>{creatorProfile?.email || "admin@campus.edu"}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTrashClick(ann)}
                            aria-label="Delete announcement"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="mt-2 block text-[10px] text-muted-foreground">
                          {new Date(ann.created_at).toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "broadcast" && (
          <div className="flex flex-col gap-4">
            <div className="mt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Previous Broadcasts (Faculty & Admin Only)</h3>
              {announcementsLoading ? (
                <Spinner />
              ) : broadcastAnnouncements.length === 0 ? (
                <Empty label="No broadcasts sent yet." />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {broadcastAnnouncements.map((ann: any) => {
                    const creatorProfile = profiles?.find(p => p.id === ann.user_id || p.username.toLowerCase() === ann.username?.toLowerCase());

                    return (
                      <div key={ann.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm relative group">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-card-foreground">{ann.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ann.message}</p>
                            
                            {ann.image_url && (
                              <div className="mt-2.5 w-full overflow-hidden rounded-xl bg-muted/20 flex justify-center">
                                <img
                                  src={ann.image_url}
                                  alt="Broadcast attachment"
                                  className="w-full h-auto object-contain rounded-lg max-h-[400px]"
                                />
                              </div>
                            )}

                            {ann.link_url && (
                              <p className="mt-2.5">
                                <a
                                  href={ann.link_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                                >
                                  {ann.link_text || "View"} →
                                </a>
                              </p>
                            )}

                            <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>By: @{creatorProfile?.username || ann.username || "Admin"} ({creatorProfile?.role || "admin"})</span>
                              <span>{creatorProfile?.email || "admin@campus.edu"}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTrashClick(ann)}
                            aria-label="Delete broadcast"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="mt-2 block text-[10px] text-muted-foreground">
                          {new Date(ann.created_at).toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {deleteModalAnn && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
        }}>
          <div style={{ background: '#1e1e1e', padding: '24px', borderRadius: '12px', width: '90%', maxWidth: '400px', textAlign: 'center', border: '1px solid #333' }}>
            <h3 style={{ color: '#fff', marginBottom: '12px', fontSize: '18px' }}>Delete Options</h3>
            <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '14px' }}>Choose how you want to delete this item:</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                type="button"
                onClick={() => handleDeleteChoice('everyone', deleteModalAnn)}
                style={{ padding: '12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Delete from Everyone
              </button>
              
              <button 
                type="button"
                onClick={() => handleDeleteChoice('me', deleteModalAnn)}
                style={{ padding: '12px', background: '#374151', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Delete from Me`
              </button>
              
              <button 
                type="button"
                onClick={() => handleDeleteChoice('cancel', deleteModalAnn)}
                style={{ padding: '12px', background: 'transparent', color: '#9ca3af', border: '1px solid #4b5563', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  )
}
function Empty({ label }: { label: string }) {
  return <p className="py-16 text-center text-sm text-muted-foreground">{label}</p>
}
