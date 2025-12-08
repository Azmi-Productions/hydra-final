import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://czbuztyqcgebshlrptnm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YnV6dHlxY2dlYnNobHJwdG5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwOTE0ODYsImV4cCI6MjA2MDY2NzQ4Nn0.zpdZhH-MfYzuc3RDetpMHoULOZW89RpYynFHgzsbgPY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
