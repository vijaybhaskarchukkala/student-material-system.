"use client"

import { useRef, useState } from "react"
import { ImagePlus, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { CATEGORIES, type Category } from "@/lib/campus-data"

export function PostItem({
  onSubmit,
}: {
  onSubmit: (item: {
    title: string
    category: Category
    price: number
    image: string
    owner: string
  }) => Promise<void>
}) {
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<Category>("Books")
  const [price, setPrice] = useState("")
  const [isFree, setIsFree] = useState(false)
  const [details, setDetails] = useState("")
  const [pickupPlace, setPickupPlace] = useState("")
  const [phone, setPhone] = useState("")
  const [image, setImage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const canSubmit = title.trim().length > 0 && details.trim().length > 0 && !submitting

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => setImage(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
     await onSubmit({
        title: title.trim(),
        category,
        price: isFree ? 0 : Number(price) || 0,
        image: image ?? "/items/textbooks.png",
        owner: details.trim(),
        pickup_place: pickupPlace.trim(),
        phone: phone.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post your listing. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 bg-background/85 px-5 pb-3 pt-5 backdrop-blur-md">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Post an Item</h1>
        <p className="text-xs text-muted-foreground">Share something with your campus in a few taps.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 pb-32 pt-2">
        <Field label="Product Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Operating Systems Textbook"
            className="input"
          />
        </Field>

        <Field label="Category">
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="input appearance-none pr-9"
            >
              {CATEGORIES.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              ▾
            </span>
          </div>
        </Field>

        <Field label="Price">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3">
              <span className="text-sm font-semibold text-muted-foreground">₹</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={isFree ? "" : price}
                disabled={isFree}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsFree((v) => !v)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors",
                isFree
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
              aria-pressed={isFree}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-md border",
                  isFree ? "border-accent-foreground bg-accent-foreground/10" : "border-border",
                )}
              >
                {isFree && <Check className="h-3.5 w-3.5" />}
              </span>
              Free
            </button>
          </div>
        </Field>

        <Field label="Image">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          {image ? (
            <div className="relative overflow-hidden rounded-2xl border border-border">
              <img src={image || "/placeholder.svg"} alt="Selected item" className="aspect-[3/4] w-full object-cover" />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-foreground shadow"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card text-muted-foreground"
            >
              <ImagePlus className="h-7 w-7" />
              <span className="text-sm font-medium">Tap to upload a photo</span>
              <span className="text-xs">Portrait 3:4 looks best</span>
            </button>
          )}
        </Field>

        <Field label="Enter Your Details (Name, Year, Branch)">
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            placeholder="Ex: Ch Vijay Bhaskar, 2nd Year, CSE"
            className="input resize-none leading-relaxed"
          />
        </Field>
       <Field label="Pickup Place">
      <input
        value={pickupPlace}
        onChange={(e) => setPickupPlace(e.target.value)}
        placeholder="Canteen"
        className="input"
      />
    </Field>

    <Field label="Phone number (Optional)">
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="e.g. 9876543210"
        className="input"
      />
    </Field>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-1 w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity active:scale-[0.99] disabled:opacity-40"
        >
          {submitting ? "Posting…" : "Submit Listing"}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  )
}
