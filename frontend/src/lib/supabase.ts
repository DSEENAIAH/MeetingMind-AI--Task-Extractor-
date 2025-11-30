/**
 * supabase.ts
 * 
 * Purpose: Initialize and export Supabase client for authentication and database operations
 */

/**
 * supabase.ts
 * 
 * Purpose: Initialize and export Supabase client for authentication and database operations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
