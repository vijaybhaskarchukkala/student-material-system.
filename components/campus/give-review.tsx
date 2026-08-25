"use client"

import { useEffect, useState } from "react"
import { X, MessageSquareHeart, CheckCircle2, ChevronDown, Loader2 } from "lucide-react"
import { fetchFacultyProfiles, submitReview } from "@/lib/api"

const CATEGORIES = [
  "Features",
  "Feedback",
  "Complaint to Faculty",
  "Complaint to Admin",
  "Other",
] as const

type FacultyOption = {
  id: string
  username: string
}

export function GiveReview({
  userId,
  username,
  phone,
  onClose,
  onPhoneRequired,
}: {
  userId: string
  username: string
  phone: string
  onClose: () => void
  onPhoneRequired: () => void
}) {
  const [category, setCategory] = useState<string>("Feedback")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([])
  const [selectedFacultyId, setSelectedFacultyId] = useState("")
  const [facultyLoading, setFacultyLoading] = useState(false)

  useEffect(() => {
    if (category !== "Complaint to Faculty") {
      setSelectedFacultyId("")
      return
    }

    let active = true
    setFacultyLoading(true)
    setError(null)

    fetchFacultyProfiles()
      .then((data) => {
        if (active) setFacultyList(data)
      })
      .catch((err) => {
        if (active) {
          setFacultyList([])
          setError(err instanceof Error ? err.message : "Could not load faculty members.")
        }
      })
      .finally(() => {
        if (active) setFacultyLoading(false)
      })

    return () => {
      active = false
    }
  }, [category])

  async function handleSubmit() {
    if (message.trim().length < 5 || submitting) return

    if (!phone?.trim()) {
      onClose()
      onPhoneRequired()
      return
    }

    const selectedFaculty = facultyList.find((faculty) => faculty.id === selectedFacultyId)

    if (category === "Complaint to Faculty" && !selectedFaculty) {
      setError("Please select a faculty member.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await submitReview(
        userId,
        username,
        phone,
        category,
        message,
        selectedFaculty?.id ?? null,
        selectedFaculty?.username ?? null,
      )
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="size-10 text-accent" />
          <h2 className="text-lg font-bold text-foreground">Message Sent Successfully</h2>
          <p className="text-sm text-muted-foreground text-pretty">
            {category === "Complaint to Faculty"
              ? "Your message has been sent to the admin team and the selected faculty member."
              : "Your message has been sent to the admin team. Thank you!"}
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

          <div className="mb-3 flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat)
                  setError(null)
                }}
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

          {category === "Complaint to Faculty" && (
            <div className="mb-3">
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Select Faculty Member</label>
              <div className="relative">
                <select
                  value={selectedFacultyId}
                  onChange={(e) => {
                    setSelectedFacultyId(e.target.value)
                    if (error) setError(null)
                  }}
                  disabled={facultyLoading}
                  className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-3 pr-10 text-sm text-foreground outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                >
                  <option value="">
                    {facultyLoading ? "Loading faculty..." : "Select a faculty member"}
                  </option>
                  {facultyList.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      @{faculty.username}
                    </option>
                  ))}
                </select>
                {facultyLoading ? (
                  <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : (
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
              </div>
              {category === "Complaint to Faculty" && !facultyLoading && facultyList.length === 0 && (
                <p className="mt-1.5 text-xs text-muted-foreground">No faculty members are available right now.</p>
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
            disabled={message.trim().length < 5 || submitting || facultyLoading}
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
