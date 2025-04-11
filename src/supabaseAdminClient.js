import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  'https://xnlbzynkqewwmdbukbxx.supabase.co',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE
);

export default supabaseAdmin