/**
 * Supabase client — singleton for frontend.
 * Used ONLY for Realtime subscriptions.
 * All data fetching still goes through FastAPI (JWT-secured).
 *
 * We use the anon key here (safe — RLS is enabled on all tables).
 * Realtime subscription filtering is done in JS by user_id,
 * because we are NOT using Supabase Auth (no auth.uid()).
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
        "[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. " +
        "Realtime notifications will be disabled."
    );
}

export const supabase =
    SUPABASE_URL && SUPABASE_ANON_KEY
        ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            realtime: {
                params: {
                    eventsPerSecond: 10,
                },
            },
            // We do NOT use Supabase Auth — disable auto session management
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
            },
        })
        : null;
