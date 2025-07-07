import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../types/supabase';
import { DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '../../config';

// This check ensures we don't accidentally try to use this on the client-side.
if (typeof window !== 'undefined') {
  throw new Error('This Supabase client is for server-side use only.');
}

export function createClient() {
  return createSupabaseClient<Database>(
    DATABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // Important for server-side clients
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
