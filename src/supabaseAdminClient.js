import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  'https://xnlbzynkqewwmdbukbxx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhubGJ6eW5rcWV3d21kYnVrYnh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjkwNDUzOCwiZXhwIjoyMDU4NDgwNTM4fQ.m6TaIyTS1Nl6AffMaD87ij_Kizhje3lOPNAiRcMWrgg' // ← iš Supabase Settings > API
)

export default supabaseAdmin