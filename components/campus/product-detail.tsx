"use client"

import { useState } from "react"
import { ChevronLeft, Tag, User2, CheckCircle2, Clock, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { CATEGORY_ICON, formatPrice, type Item } from "@/lib/campus-data"

export function ProductDetail({
  item,
  currentUserId,
  isAdmin,
  onBack,
  onRequest,
  onDelete,
}: {
  item: Item
  currentUserId: string
  isAdmin: boolean
  onBack: () => void
  onRequest: (item: Item) => Promise<void>
  onDelete: (item: Item) => Promise<void>
}) {
  const isFree = item.price === 0
  const CategoryIcon = CATEGORY_ICON[item.category]
  const isMine = item.owner_id === currentUserId
  const requestedByMe = item.requested_by === currentUserId
  const [busy, setBusy] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  async function handleRequest() {
    if (busy) return
    setBusy(true)
    setRequestError(null)
    try {
      await onRequest(item)
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : "Could not send your request. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (busy) return
    if (!confirm("Delete this listing permanently?")) return
    setBusy(true)
    try {
      await onDelete(item)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="relative">
        <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
          <img src={item.image || "/placeholder.svg"} alt={item.title} className="h-full w-full object-cover" />
        </div>
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="absolute left-4 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md backdrop-blur-sm active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span
          className={cn(
            "absolute right-4 top-5 rounded-full px-3 py-1.5 text-sm font-bold shadow-md",
            isFree ? "bg-accent text-accent-foreground" : "bg-card/95 text-foreground",
          )}
        >
          {formatPrice(item.price)}
        </span>
      </div>

      <div className="flex flex-col gap-5 rounded-t-3xl -mt-5 bg-background px-5 pb-40 pt-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold leading-snug text-foreground text-balance">{item.title}</h1>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            <CategoryIcon className="h-3.5 w-3.5" />
            {item.category}
          </span>
        </div>

        {item.status !== "available" && (
          <span
            className={cn(
              "inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
              item.status === "sold" ? "bg-secondary text-secondary-foreground" : "bg-accent text-accent-foreground",
            )}
          >
            {item.status === "sold" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
            {item.status}
          </span>
        )}

        <section>
          <h2 className="text-sm font-bold text-foreground">Product Details:</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {isFree
              ? "This item is being shared for free with a fellow student. Reach out through the details below to arrange a pickup."
              : "Gently used and in good condition. Contact the owner using the details below to check availability and arrange a handover on campus."}
          </p>
        </section>

        <section>
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Tag className="h-4 w-4 text-primary" />
            Price:
          </h2>
          <p className="mt-1 text-lg font-bold text-primary">{formatPrice(item.price)}</p>
        </section>

      <section>
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <User2 className="h-4 w-4 text-primary" />
            Product Owner Details:
          </h2>
          <p className="mt-1 text-xs font-semibold text-primary">@{item.owner_username}</p>
          <p className="mt-1 rounded-2xl border border-border bg-card p-3.5 text-sm leading-relaxed text-muted-foreground">
            {item.owner}
          </p>

          {item.pickup_place && (
            <p className="mt-2 text-sm text-foreground">
              <strong className="text-muted-foreground">Pickup Place:</strong> {item.pickup_place}
            </p>
          )}

          {item.phone && (
            <p className="mt-1 text-sm text-foreground">
              <strong className="text-muted-foreground">Phone:</strong> {item.phone}
            </p>
          )}
        </section>

        {isAdmin && !isMine && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-destructive/40 px-3 py-2 text-sm font-semibold text-destructive disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete listing (admin)
          </button>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3 backdrop-blur-md">
        {requestError && (
          <p role="alert" className="mb-2 text-center text-sm font-medium text-destructive">
            {requestError}
          </p>
        )}
        <ActionButton
          item={item}
          isMine={isMine}
          requestedByMe={requestedByMe}
          busy={busy}
          onRequest={handleRequest}
        />
      </div>
    </div>
  )
}

function ActionButton({
  item,
  isMine,
  requestedByMe,
  busy,
  onRequest,
}: {
  item: Item
  isMine: boolean
  requestedByMe: boolean
  busy: boolean
  onRequest: () => void
}) {
  const base =
    "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-colors"

  if (isMine) {
    return (
      <div className={cn(base, "bg-secondary text-secondary-foreground")}>This is your listing</div>
    )
  }
  if (item.status === "sold") {
    return <div className={cn(base, "bg-secondary text-secondary-foreground")}>Sold</div>
  }
  if (item.status === "pending") {
    return (
      <div className={cn(base, "bg-accent/80 text-accent-foreground")}>
        <Clock className="h-5 w-5" />
        {requestedByMe ? "Requested · Pending" : "Pending"}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={busy}
      className={cn(base, "bg-primary text-primary-foreground active:scale-[0.99] disabled:opacity-60")}
    >
      {busy ? "Requesting…" : "I Need This"}
    </button>
  )
}
