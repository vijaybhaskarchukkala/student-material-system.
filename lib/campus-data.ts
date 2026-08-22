import { BookOpen, Wrench, FlaskConical, NotebookPen, LayoutGrid, type LucideIcon } from "lucide-react"

export type Category = "Books" | "Tools" | "Lab Coats" | "Notes"

export type ItemStatus = "available" | "pending" | "sold"

/** A listing as stored in the Supabase `listings` table. */
export interface Item {
  id: string
  title: string
  category: Category
  /** price in rupees, 0 means the item is free */
  price: number
  image: string
  /** free-form contact details written by the seller */
  owner: string
  /** username of the seller (denormalised for display) */
  owner_username: string
  /** auth uuid of the seller */
  owner_id: string
  status: ItemStatus
  /** auth uuid of the user who tapped "I Need This" (null when available) */
  requested_by: string | null
  pickup_place?: string
  phone?: string
  created_at: string
}

/** A row from the Supabase `profiles` table. */
export interface Profile {
  id: string
  username: string
  email: string
  sold_count: number
  is_banned: boolean
  /** mobile number saved by the user (no verification required) */
  phone?: string | null
  /** 'student' | 'faculty' — controls dashboard access */
  role?: string | null
  created_at: string
}

/** A row from the Supabase `reviews` table. */
export interface Review {
  id: string
  user_id: string
  username: string
  message: string
  created_at: string
}

export const CATEGORIES: { label: Category; icon: LucideIcon }[] = [
  { label: "Books", icon: BookOpen },
  { label: "Tools", icon: Wrench },
  { label: "Lab Coats", icon: FlaskConical },
  { label: "Notes", icon: NotebookPen },
]

export const ALL_FILTER = { label: "All" as const, icon: LayoutGrid }

export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  Books: BookOpen,
  Tools: Wrench,
  "Lab Coats": FlaskConical,
  Notes: NotebookPen,
}

export function formatPrice(price: number): string {
  return price === 0 ? "FREE" : `₹${price}`
}
