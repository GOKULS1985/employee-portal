// ============================================================
// SUPABASE CONNECTION CONFIG
// ============================================================
// This file is what "connects" your website to your database.
// Every other JS file loads this first and uses the values below.
//
// WHERE TO GET THESE TWO VALUES (full steps in SETUP-INSTRUCTIONS.md,
// Section 3):
//   1. Open your project at https://supabase.com/dashboard
//   2. Click the gear icon (Project Settings) → "API"
//   3. Copy "Project URL" → paste below as SUPABASE_URL
//   4. Copy "anon public" key → paste below as SUPABASE_ANON_KEY
//
// IS IT SAFE THAT THIS KEY IS PUBLIC / VISIBLE IN THE BROWSER?
// Yes — and this is the key thing to understand about this whole
// architecture. The "anon" key is DESIGNED to be public. It does
// not grant access to anything by itself. What actually controls
// access is the Row Level Security (RLS) policies you set up in
// supabase-setup.sql — THOSE are the real lock. The anon key is
// just "the address of the building," RLS is "which doors are
// unlocked." Never paste your "service_role" key here (a different,
// much more powerful key shown in the same dashboard) — that one
// truly must stay secret and is never used in frontend code.
// ============================================================

const SUPABASE_URL = "https://lluvmzxetxcyexlxhgzh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4iPyojFUpGenPZUJyq-waA_NS3HwGRg";

// Creates the actual connection object that every other file uses.
// "supabase" here refers to the library loaded via the <script> tag
// in each HTML file (the @supabase/supabase-js CDN link).
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
