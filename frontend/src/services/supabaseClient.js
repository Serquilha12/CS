import { createClient } from '@supabase/supabase-js';

// Configuração do cliente Supabase no Frontend para Uploads Diretos ao Storage
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://enrdwqzrdqgmyacelkxb.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVucmR3cXpyZHFnbXlhY2Vsa3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMzUxMzMsImV4cCI6MjEwMDgxMTEzM30.KqApJwBLLzdEeB_UfR1S_gumFD6J-XZBNK277AQ3n6E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
