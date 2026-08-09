'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bqemtqersutsyyhjofco.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_zGald0jnAk9QHmF-ylYibg_Jg1W5at1';

let client: SupabaseClient | null = null;

/** Lazily-created singleton Supabase client. */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
  }
  return client;
}
