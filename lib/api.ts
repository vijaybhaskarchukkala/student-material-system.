"use client"

import { getSupabase } from "./supabase/client"
import type { Category, Item, Profile, Review } from "./campus-data"

/** Postgres unique-violation error code (duplicate username). */
const UNIQUE_VIOLATION = "23505"

/** Turn a raw Supabase error into a friendly, actionable message. */
function friendlyError(error: { code?: string; message?: string } | null, fallback: string): Error {
  if (error?.code === UNIQUE_VIOLATION) {
    return new Error("That username is already taken. Please choose another.")
  }
  return new Error(error?.message?.trim() ? error.message : fallback)
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
  if (error) throw error
  return (data as Profile) ?? null
}

export async function createProfile(userId: string, email: string, username: string): Promise<Profile> {
  const supabase = getSupabase()
  const clean = username.trim()
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, email, username: clean }, { onConflict: "id" })
    .select("*")
    .single()
  if (error) throw friendlyError(error, "Could not save your username. Please try again.")
  return data as Profile
}

export async function updateUsername(userId: string, username: string): Promise<void> {
  const supabase = getSupabase()
  const clean = username.trim()

  const { error } = await supabase.from("profiles").update({ username: clean }).eq("id", userId)
  if (error) throw friendlyError(error, "Could not update your username. Please try again.")

  const { error: authError } = await supabase.auth.updateUser({ data: { username: clean } })
  if (authError) throw friendlyError(authError, "Saved your username, but could not sync your account. Try again.")

  await supabase.from("listings").update({ owner_username: clean }).eq("owner_id", userId)
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------
export async function fetchListings(): Promise<Item[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("listings").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Item[]
}

export async function createListing(input: {
  owner_id: string
  owner_username: string
  title: string
  category: Category
  price: number
  image: string
  owner: string
}): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("listings").insert({ ...input, status: "available", requested_by: null })
  if (error) throw error
}

export async function requestListing(
  listing: Item,
  requesterId: string,
  requesterUsername: string,
  requesterPhone = "",
): Promise<void> {
  const supabase = getSupabase()
  const { data: claimed, error } = await supabase
    .from("listings")
    .update({ status: "pending", requested_by: requesterId })
    .eq("id", listing.id)
    .eq("status", "available")
    .select("id")
  if (error) throw new Error(error.message || "Could not send your request. Please try again.")
  if (!claimed || claimed.length === 0) {
    throw new Error("Sorry, this item was just requested by someone else.")
  }
  // Store the buyer's verified phone number on the request so the seller's
  // notification can show how to reach them.
  const { error: requestError } = await supabase.from("requests").insert({
    listing_id: listing.id,
    requester_id: requesterId,
    requester_username: requesterUsername,
    requester_phone: requesterPhone,
  })
  if (requestError) throw new Error(requestError.message || "Could not notify the owner. Please try again.")
}

export async function markSold(listing: Item): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("listings").update({ status: "sold" }).eq("id", listing.id)
  if (error) throw error
  const { error: rpcError } = await supabase.rpc("increment_sold", { p_user_id: listing.owner_id })
  if (rpcError) throw rpcError
}

export async function resetToAvailable(listing: Item): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("listings")
    .update({ status: "available", requested_by: null })
    .eq("id", listing.id)
  if (error) throw error
}

export async function deleteListing(listingId: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("listings").delete().eq("id", listingId)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Reviews & Complaints Routing
// ---------------------------------------------------------------------------
export async function fetchReviews() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("complaints")
    .select("*")
    .order("created_at", { ascending: false })
  
  if (error) {
    console.error("Error fetching reviews:", error)
    return []
  }
  return data || []
}

export async function submitReview(
  userId: string,
  username: string,
  category: string,
  message: string,
  facultyIds: string[] = [],
): Promise<void> {
  const supabase = getSupabase()

  // 1. అడ్మిన్ చూసే 'complaints' టేబుల్‌లో అన్ని మెసేజ్‌లు సేవ్ అవుతాయి (admin always sees everything)
  const { error } = await supabase.from("complaints").insert({
    user_id: userId,
    username,
    category,
    message: message.trim(),
  })
  if (error) throw error

  // 2. కేవలం 'Complaint to Faculty' అయితేనే ఫ్యాకల్టీ టేబుల్‌కి వెళ్తుంది, only the selected faculty can see it
  if (category === "Complaint to Faculty") {
    try {
      await supabase.from("faculty_complaints").insert({
        user_id: userId,
        username,
        message: message.trim(),
        target_faculty_ids: facultyIds,
      })
    } catch (err) {
      console.error("Faculty complaint insert error:", err)
    }
  }
}

/** All profiles with role = 'faculty', used to populate the faculty picker dropdown. */
export async function fetchFacultyList(): Promise<Profile[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "faculty")
    .order("username", { ascending: true })
  if (error) {
    console.error("Error fetching faculty list:", error)
    return []
  }
  return (data ?? []) as Profile[]
}
export async function deleteReview(id: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("complaints").delete().eq("id", id)
  if (error) throw error
}

export async function fetchFacultyComplaints() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("faculty_complaints")
    .select("*")
    .order("created_at", { ascending: false })
  
  if (error) {
    console.error("Error fetching faculty complaints:", error)
    return []
  }
  return data || []
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export async function fetchAllProfiles(): Promise<Profile[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function setBanned(userId: string, banned: boolean): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from("profiles").update({ is_banned: banned }).eq("id", userId)
  if (error) throw error
}

export async function deleteAccount(userId: string): Promise<void> {
  const supabase = getSupabase()
  const { error: rpcError } = await supabase.rpc("delete_own_account")

  if (rpcError) {
    await supabase.from("reviews").delete().eq("user_id", userId)
    await supabase.from("requests").delete().eq("requester_id", userId)
    const { error: listingsError } = await supabase.from("listings").delete().eq("owner_id", userId)
    if (listingsError) throw listingsError
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)
    if (profileError) throw profileError
  }

  await supabase.auth.signOut()
}

export interface ProfileStats {
  active: number
  pending: number
  sold: number
}

export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const supabase = getSupabase()
  const { data, error } = await supabase.from("listings").select("status").eq("owner_id", userId)
  if (error) throw error
  const rows = (data ?? []) as { status: string }[]
  return {
    active: rows.filter((r) => r.status === "available").length,
    pending: rows.filter((r) => r.status === "pending").length,
    sold: rows.filter((r) => r.status === "sold").length,
  }
}

// ---------------------------------------------------------------------------
// Admin Announcements
// ---------------------------------------------------------------------------
export async function fetchAnnouncements() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("admin_announcements")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data
}

export async function createAnnouncement(announcement: { 
  title: string; 
  message: string; 
  image_url?: string | null;
  link_url?: string | null; 
  link_text?: string 
}) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("admin_announcements")
    .insert([announcement])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAnnouncement(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("admin_announcements")
    .delete()
    .eq("id", id)
  if (error) throw error
}
