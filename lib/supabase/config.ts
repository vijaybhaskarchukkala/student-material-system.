// Public Supabase project configuration.
// The URL and publishable (anon) key are safe to expose in client code – row
// level security in the database is what protects the data.
//
// These prefer environment variables (recommended) and fall back to the
// project's known public values so the app keeps working if the vars are
// not set. To override, define NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY in your project settings.
export const SUPABASE_URL = 
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://kemplzeojjgrumyzusso.co"

export const SUPABASE_ANON_KEY = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlbXBsemVvampncnVteXp1c3NvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MzMxMDAsImV4cCI6MjEwMzAwOTEwMH0.tPRS9kMb3zPgds6WQ1JS803fgf0SUPwAjpUwH9SwBa8"

// The one account that is granted Super-Admin authority across the app.
export const ADMIN_EMAIL = "vijaybhaskar.ch9045@gmail.com"

// Passcode required on every single visit before the app is shown.
export const ACCESS_PASSCODE = "studentmaterialsystemvb"
