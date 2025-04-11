import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  'https://xnlbzynkqewwmdbukbxx.supabase.co',
<<<<<<< HEAD
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE
);  
=======
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhubGJ6eW5rcWV3d21kYnVrYnh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjkwNDUzOCwiZXhwIjoyMDU4NDgwNTM4fQ.m6TaIyTS1Nl6AffMaD87ij_Kizhje3lOPNAiRcMWrgg' // ← iš Supabase Settings > API
)
>>>>>>> a2cf96ea4da0b3d555a650d6185c4a37ad82685e

export default supabaseAdmin