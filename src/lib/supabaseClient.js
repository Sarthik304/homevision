import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// null until VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are set (see README) — auth/design UI
// checks this and shows a setup hint instead of the app crashing on a missing configuration.
export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null
