
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  // Alert the user on the screen if possible, or just log
}

// Initialize with fallbacks to prevent crash during module load. 
// Requests will fail, but the app won't white-screen immediately.
export const supabase = createClient(
  supabaseUrl || 'https://fhfamquilobeoibqfhwh.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZmFtcXVpbG9iZW9pYnFmaHdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjE0ODksImV4cCI6MjA4MjY5NzQ4OX0.pHhokXv_POA3oWfG3GuJ9W3SEBoD6dyykiAIGF2gzSM'
);
