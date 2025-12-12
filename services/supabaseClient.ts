import { createClient } from '@supabase/supabase-js';

// Safely retrieve environment variables to prevent runtime crashes
// This handles cases where import.meta.env is undefined (causing the TypeError)
const getEnv = () => {
    // Check if import.meta.env exists (Vite)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        return (import.meta as any).env;
    }
    // Check if process.env exists (Legacy/Node)
    if (typeof process !== 'undefined' && process.env) {
        return process.env;
    }
    return {};
};

const env = getEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://grnyhnesptqggfcubwzq.supabase.co';
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.warn("Supabase Key is missing! Check your Vercel Environment Variables. Features requiring database access will fail.");
}

export const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_KEY || 'placeholder-key-to-prevent-crash'
);