/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean up the URL just in case it includes the REST API path suffix
const cleanUrl = supabaseUrl ? supabaseUrl.replace(/\/rest\/v1\/?$/, '') : '';

if (!cleanUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Please check your environment variables.');
}

export const supabase = createClient(cleanUrl, supabaseAnonKey);
