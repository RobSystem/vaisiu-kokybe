import { createClient } from '@supabase/supabase-js'

// 👇 Čia įrašyk savo duomenis iš Supabase projekto
const supabaseUrl = 'https://xnlbzynkqewwmdbukbxx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhubGJ6eW5rcWV3d21kYnVrYnh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MDQ1MzgsImV4cCI6MjA1ODQ4MDUzOH0.8hLeRw-vqGHXoNCUToDL4q-IHqAmx60Y34KYjDMeu3g'

export const supabase = createClient(supabaseUrl, supabaseKey)
