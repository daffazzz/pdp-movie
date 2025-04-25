import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get environment variables with safer fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase credentials are available
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials. Please check environment variables.');
}

// Create Supabase client
const createSupabaseClient = (): SupabaseClient | null => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Cannot initialize Supabase client: Missing required environment variables');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Export the client instance
export const supabase = createSupabaseClient(); 