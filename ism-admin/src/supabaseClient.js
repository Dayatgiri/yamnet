import { createClient } from '@supabase/supabase-js'

// Kredensial ini disesuaikan dengan aplikasi Android Anda
const supabaseUrl = 'https://jbshcgswqzcemuuubdic.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impic2hjZ3N3cXpjZW11dXViZGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNzg1ODQsImV4cCI6MjA4ODc1NDU4NH0.bNfBpc0FZOxXIMHozYfciVytN-WPeYBBhUaZ7g7HbJU'

export const supabase = createClient(supabaseUrl, supabaseKey)