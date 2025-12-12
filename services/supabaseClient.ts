import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION INSTRUCTIONS ---
// 1. Go to https://supabase.com/dashboard/project/_/settings/api
// 2. Copy "Project URL" into SUPABASE_URL below.
// 3. Copy "anon public" Key into SUPABASE_KEY below.

const SUPABASE_URL = 'https://grnyhnesptqggfcubwzq.supabase.co'; // REPLACE THIS
const SUPABASE_KEY = 'sb_publishable_TxzSiqP7Zn5omK4hkk423g_z5hDbdrT';             // REPLACE THIS

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
