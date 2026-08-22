"use client"

import { useState } from "react"
import { CheckCircle2, Store, PlusCircle, Clock, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPrice, type Item } from "@/lib/campus-data"

export function MyListings({
  items,
  currentUserId,
  onMarkSold,
  onReset,
  onOpen,
  onPost,
}: {
  items: Item[]
  currentUserId: string
  onMarkSold: (item: Item) => Promise<void>
  onReset: (item: Item) => Promise<void>
  onOpen: (item: Item) => void
  onPost: () => void
}) {
  const mine = items.filter((item) => item.owner_id === currentUserId)
  const activeCount = mine.filter((i) => i.status === "available").length
  const pendingCount = mine.filter((i) => i.status === "pending").length
  const soldCount = mine.filter((i) => i.status === "sold").length

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 bg-background/85 px-5 pb-3 pt-5 backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-tight text-foreground">My Listings</h1>
        <p className="text-xs text-muted-foreground">
          {activeCount} active · {pendingCount} pending · {soldCount} sold
        </p>
      </header>

      <div className="flex flex-col gap-3 px-5 pb-32 pt-2">
        {mine.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Store className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">You haven&apos;t posted anything yet</p>
            <button
              type="button"
              onClick={onPost}
              className="mt-1 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <PlusCircle className="h-4 w-4" />
              Post your first item
            </button>
          </div>
        ) : (
          mine.map((item) => (
            <ListingRow
              key={item.id}
              item={item}
              onOpen={onOpen}
              onMarkSold={onMarkSold}
              onReset={onReset}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ListingRow({
  item,
  onOpen,
  onMarkSold,
  onReset,
}: {
  item: Item
  onOpen: (item: Item) => void
  onMarkSold: (item: Item) => Promise<void>
  onReset: (item: Item) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const isSold = item.status === "sold"
  const isPending = item.status === "pending"

  async function run(fn: (item: Item) => Promise<void>) {
    if (busy) return
    setBusy(true)
    try {
      await fn(item)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn("flex gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm", isSold && "opacity-70")}>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-xl bg-muted"
      >
        <img src={item.image || "/placeholder.svg"} alt={item.title} className="h-full w-full object-cover" />
      </button>

      <div className="flex min-w-0 flex-1 flex-col">
        <button type="button" onClick={() => onOpen(item)} className="text-left">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">{item.title}</p>
        </button>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-bold text-primary">{formatPrice(item.price)}</span>
          {isPending && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
              <Clock className="h-3 w-3" />
              Pending
            </span>
          )}
          {isSold && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
              Sold
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {isSold ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Completed · removed from feed
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => run(onMarkSold)}
                disabled={busy}
                className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground transition-colors active:scale-[0.99] disabled:opacity-50"
              >
                Mark as Sold
              </button>
              {isPending && (
                <button
                  type="button"
                  onClick={() => run(onReset)}
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-sm font-semibold text-foreground transition-colors active:scale-[0.99] disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset to Available
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
