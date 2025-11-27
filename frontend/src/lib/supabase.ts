/**
 * supabase.ts
 * 
 * Purpose: Initialize and export Supabase client for authentication and database operations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bgfqfiisocracnccbwvc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZnFmaWlzb2NyYWNuY2Nid3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNjUyMTgsImV4cCI6MjA3OTY0MTIxOH0.rI2zyZJxADp-LW2U6EkGVv91dhEv56bYFv3-YD-_Atg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
