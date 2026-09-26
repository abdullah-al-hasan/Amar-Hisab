import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://xzppcizmhkfxptwuaced.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_geBi6HGHw-DnO-dQ3PU1Yg_X8UYhr44';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
