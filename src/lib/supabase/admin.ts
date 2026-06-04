import { createClient } from '@supabase/supabase-js'

// Cliente con service role key — bypassa RLS
// Usar SOLO en server-side (webhooks, tareas de sistema)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
