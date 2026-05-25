import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials missing. Copy client/.env.example to client/.env and fill in the values.'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

export type Database = {
  lists: {
    id: number;
    name: string;
    created_at: string;
  };
  items: {
    id: number;
    list_id: number;
    name: string;
    quantity: number;
    created_at: string;
  };
};
