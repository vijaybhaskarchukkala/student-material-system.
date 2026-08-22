// Public Supabase project configuration.
// The URL and publishable (anon) key are safe to expose in client code – row
// level security in the database is what protects the data.
//
// These prefer environment variables (recommended) and fall back to the
// project's known public values so the app keeps working if the vars are
// not set. To override, define NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY in your project settings.
export const SUPABASE_URL = 
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ovvcnarqrqjrnzfetcsf.supabase.co"

export const SUPABASE_ANON_KEY = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_9GNjZBpxSDG2i2b6MYRAsw_l9uwoQ22"

// The one account that is granted Super-Admin authority across the app.
export const ADMIN_EMAIL = "vijaybhaskar.ch9045@gmail.com"

// Passcode required on every single visit before the app is shown.
export const ACCESS_PASSCODE = "studentmaterialsystemvb"
