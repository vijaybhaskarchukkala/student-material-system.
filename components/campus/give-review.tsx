"use client"

import { useState, useEffect } from "react"
import { X, MessageSquareHeart, CheckCircle2, ChevronDown, Check } from "lucide-react"
import { submitReview, fetchFacultyList } from "@/lib/api"
import type { Profile } from "@/lib/campus-data"

const CATEGORIES = [
  "Features",
  "Feedback",
  "Complaint to Faculty",
  "Complaint to Admin",
  "Other",
] as const

export function GiveReview({
  userId,
  username,
  onClose,
}: {
  userId: string
  username: string
  onClose: () => void
}) {
  const [category, setCategory] = useState<string>("Feedback")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Faculty picker (only used when category === "Complaint to Faculty")
  const [facultyList, setFacultyList] = useState<Profile[]>([])
  const [facultyLoading, setFacultyLoading] = useState(false)
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>([])
  const [showFacultyDropdown, setShowFacultyDropdown] = useState(false)

  useEffect(() => {
    if (category === "Complaint to Faculty" && facultyList.length === 0 && !facultyLoading) {
      setFacultyLoading(true)
      fetchFacultyList()
        .then(setFacultyList)
        .finally(() => setFacultyLoading(false))
    }
    if (category !== "Complaint to Faculty") {
      setShowFacultyDropdown(false)
    }
  }, [category, facultyList.length, facultyLoading])

  function toggleFacultySelection(id: string) {
    setSelectedFacultyIds((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))
    if (error) setError(null)
  }

  const isFacultyComplaint = category === "Complaint to Faculty"
  const facultyStepInvalid = isFacultyComplaint && selectedFacultyIds.length === 0

  async function handleSubmit() {
    if (message.trim().length < 5) return
    if (facultyStepInvalid) {
      setError("Please select at least one faculty member.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await submitReview(userId, username, category, message, selectedFacultyIds)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message. Please try again.")
      setSubmitting(false)
    }
  }

  const selectedFacultyNames = facultyList
    .filter((f) => selectedFacultyIds.includes(f.id))
    .map((f) => f.username)

  return (
    <Overlay onClose={onClose}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="size-10 text-accent" />
          <h2 className="text-lg font-bold text-foreground">Message Sent Successfully</h2>
          <p className="text-sm text-muted-foreground text-pretty">
            Your message has been sent to the admin team
            {category === "Complaint to Faculty" && selectedFacultyNames.length > 0
              ? ` and ${selectedFacultyNames.map((n) => `@${n}`).join(", ")}`
              : ""}
            . Thank you!
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquareHeart className="size-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Feedback & Complaints</h2>
              <p className="text-xs text-muted-foreground">Select a category and share your message with us.</p>
            </div>
          </div>

          {/* Categories Selection */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Faculty picker — only shown for "Complaint to Faculty" */}
          {isFacultyComplaint && (
            <div className="relative mb-3">
              <button
                type="button"
                onClick={() => setShowFacultyDropdown((v) => !v)}
                className="input flex w-full items-center justify-between rounded-xl border p-3 text-sm bg-background text-foreground"
              >
                <span className={selectedFacultyIds.length === 0 ? "text-muted-foreground" : ""}>
                  {facultyLoading
                    ? "Loading faculty…"
                    : selectedFacultyIds.length === 0
                      ? "Select faculty (one or more)"
                      : selectedFacultyNames.map((n) => `@${n}`).join(", ")}
                </span>
                <ChevronDown className={`size-4 shrink-0 transition-transform ${showFacultyDropdown ? "rotate-180" : ""}`} />
              </button>

              {showFacultyDropdown && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border bg-background p-1.5 shadow-xl">
                  {facultyLoading ? (
                    <p className="p-2 text-xs text-muted-foreground">Loading faculty…</p>
                  ) : facultyList.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">No faculty members found.</p>
                  ) : (
                    facultyList.map((f) => {
                      const selected = selectedFacultyIds.includes(f.id)
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleFacultySelection(f.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm ${
                            selected ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground"
                          }`}
                        >
                          <span>@{f.username}</span>
                          {selected && <Check className="size-4" />}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )}

          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              if (error) setError(null)
            }}
            rows={4}
            autoFocus
            placeholder="Type your message here..."
            className="input resize-none leading-relaxed w-full rounded-xl border p-3 text-sm bg-background text-foreground"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={message.trim().length < 5 || submitting || facultyStepInvalid}
            className="mt-4 w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
          >
            {submitting ? "Sending…" : "Submit Message"}
          </button>
        </>
      )}
    </Overlay>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-foreground/40 p-3" onClick={onClose}>
      <div
        className="relative w-full rounded-3xl bg-background p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  )
}
