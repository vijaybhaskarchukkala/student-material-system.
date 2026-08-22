"use client"

import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatPrice, type Item } from "@/lib/campus-data"

export function ProductCard({
  item,
  isAdmin,
  onOpen,
  onDelete,
}: {
  item: Item
  isAdmin: boolean
  onOpen: (item: Item) => void
  onDelete: (item: Item) => Promise<void>
}) {
  const isFree = item.price === 0
  const isPending = item.status === "pending"

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm("Delete this listing permanently?")) return
    await onDelete(item)
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm">
      <button type="button" onClick={() => onOpen(item)} className="flex flex-1 flex-col text-left active:scale-[0.98]">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          <img
            src={item.image || "/placeholder.svg"}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm",
              isFree ? "bg-accent text-accent-foreground" : "bg-card/95 text-foreground",
            )}
          >
            {formatPrice(item.price)}
          </span>
          {isPending && (
            <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
              Pending
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-3">
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">{item.title}</p>
          <span className="mt-auto inline-flex w-fit rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
            {item.category}
          </span>
          <span
            className={cn(
              "rounded-xl py-2 text-center text-xs font-semibold",
              isPending ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground",
            )}
          >
            {isPending ? "Pending" : "I Need This"}
          </span>
        </div>
      </button>

      {isAdmin && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label="Delete listing"
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md active:scale-95"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
