import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ Supabase credentials not found in environment variables.');
    console.warn('   Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(
    supabaseUrl || '',
    supabaseServiceKey || ''
);
