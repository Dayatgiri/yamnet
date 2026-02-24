import { createClient } from '@supabase/supabase-js'

// Kredensial ini disesuaikan dengan aplikasi Android Anda
const supabaseUrl = 'https://gwlixwmygpmoeebbpyax.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bGl4d215Z3Btb2VlYmJweWF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3Mjg3NDQsImV4cCI6MjA4NzMwNDc0NH0.GaTpLYiL346I4ig9lAFkL4RqyVLt9t4T5KyKwAXQOVQ'

export const supabase = createClient(supabaseUrl, supabaseKey)