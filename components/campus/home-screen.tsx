"use client"

import { useMemo, useState } from "react"
import { Search, PackageOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { ALL_FILTER, CATEGORIES, type Category, type Item } from "@/lib/campus-data"
import { ProductCard } from "./product-card"

type Filter = "All" | Category

export function HomeScreen({
  items,
  isAdmin,
  onOpen,
  onDelete,
}: {
  items: Item[]
  isAdmin: boolean
  onOpen: (item: Item) => void
  onDelete: (item: Item) => Promise<void>
}) {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("All")

  const visible = useMemo(() => {
    return items
      .filter((item) => item.status !== "sold")
      .filter((item) => (filter === "All" ? true : item.category === filter))
      .filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()))
  }, [items, filter, query])

  const filters = [ALL_FILTER, ...CATEGORIES]

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 bg-background/85 px-4 pb-3 pt-5 backdrop-blur-md">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Welcome back</p>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Student Material System</h1>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Live feed</span>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search books, tools, notes…"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Search listings"
          />
        </div>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map(({ label, icon: Icon }) => {
            const isActive = filter === label
            return (
              <button
                key={label}
                type="button"
                onClick={() => setFilter(label as Filter)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            )
          })}
        </div>
      </header>

      <div className="px-4 pb-6 pt-2">
        {visible.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {visible.map((item) => (
              <ProductCard key={item.id} item={item} isAdmin={isAdmin} onOpen={onOpen} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <PackageOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No items found</p>
            <p className="max-w-[220px] text-xs text-muted-foreground">
              Try a different category or search term. New listings show up here instantly.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
