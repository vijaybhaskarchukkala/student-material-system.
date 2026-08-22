"use client"

import type React from "react"

import { useState } from "react"
import { GraduationCap, Mail, Lock, Eye, EyeOff } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { PhoneShell } from "./phone-shell"

type Mode = "signin" | "signup"

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const canSubmit = email.trim().length > 3 && password.length >= 6

  async function signInWithGoogle() {
    setGoogleLoading(true)
    setError(null)
    setInfo(null)
    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? window.location.origin,
          queryParams: { prompt: "select_account" },
        },
      })
      if (error) throw error
      // On success the browser is redirected to Google, so no further UI needed.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google sign-in. Please try again.")
      setGoogleLoading(false)
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || loading) return
    setLoading(true)
    setError(null)
    setInfo(null)
    const supabase = getSupabase()
    const trimmedEmail = email.trim()

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo:
              process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? window.location.origin,
          },
        })
        if (error) throw error
        // If email confirmation is ON there is no active session yet.
        if (!data.session) {
          setInfo("Account created. Check your email to confirm, then sign in.")
          setMode("signin")
          setPassword("")
          setLoading(false)
          return
        }
        // Session present -> the auth listener will move the user forward.
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
        if (error) throw error
        // Success -> auth listener advances to onboarding / app.
      }
    } catch (err) {
      setError(friendlyAuthError(err, mode))
      setLoading(false)
    }
  }

  return (
    <PhoneShell>
      <div className="flex flex-1 flex-col justify-center px-7 py-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <GraduationCap className="size-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Welcome to Student Material System</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            {mode === "signin"
              ? "Sign in to buy, borrow and share with students on your campus."
              : "Create an account to buy, borrow and share with students on your campus."}
          </p>
        </div>

        {/* Sign in / Sign up toggle */}
        <div className="mb-5 flex rounded-xl border border-border bg-secondary p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m)
                setError(null)
                setInfo(null)
              }}
              className={
                "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors " +
                (mode === m
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground")
              }
              aria-pressed={mode === m}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-semibold">
              Email
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="you@college.edu"
                className="input pl-9"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-semibold">
              Password
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="At least 6 characters"
                className="input pl-9 pr-11"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          {info && (
            <p role="status" className="text-sm font-medium text-primary">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="mt-1 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {loading
              ? mode === "signup"
                ? "Creating account…"
                : "Signing in…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={googleLoading}
          className="flex items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-sm font-semibold text-foreground shadow-sm transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground text-pretty">
          After your first sign-in we&apos;ll set up your profile with a unique username.
        </p>
      </div>
    </PhoneShell>
  )
}

function friendlyAuthError(err: unknown, mode: Mode): string {
  const message = err instanceof Error ? err.message : ""
  const lower = message.toLowerCase()
  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again."
  }
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead."
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email first, then sign in."
  }
  if (message) return message
  return mode === "signup"
    ? "Could not create your account. Please try again."
    : "Could not sign you in. Please try again."
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}
