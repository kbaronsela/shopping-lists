import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isMissingConfig = !supabaseUrl || !supabaseAnonKey;

export const supabase = isMissingConfig
  ? (null as unknown as ReturnType<typeof createClient>)
  : createClient(supabaseUrl!, supabaseAnonKey!);

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
