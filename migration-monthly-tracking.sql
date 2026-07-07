-- ============================================================
-- MIGRATION: ADD MONTH-BY-MONTH LEAVE & PERMISSION TRACKING
-- ============================================================
-- HOW TO USE THIS FILE:
-- This is NOT a fresh setup — it's an UPGRADE to the database
-- you already built. Run this on your EXISTING Supabase project,
-- the same way you ran supabase-setup.sql before: SQL Editor →
-- New query → paste this whole file → Run.
--
-- WHAT THIS DOES:
-- Replaces the old single "leaves_taken" / "permissions_taken"
-- numbers with 24 separate columns — one Leave count and one
-- Permission count for each of the 12 months. This matches the
-- month-by-month tracking format you provided.
--
-- YOUR EXISTING DATA IS SAFE: this only ADDS new columns. Nothing
-- is deleted. The old leaves_taken/permissions_taken columns are
-- kept for now (Step 3 below explains why) but are no longer
-- used by the website after this migration.
-- ============================================================


-- STEP 1: Add one column per month, per category.
-- Naming pattern: leave_<month> and permission_<month>, all
-- lowercase, 3-letter month abbreviations — this keeps every
-- column name short, consistent, and easy to reference in code.
-- Default value is NULL (not 0) — NULL specifically means
-- "nothing entered yet," which the website distinguishes from a
-- real, entered "0" (see the comments in dashboard.js for how
-- this distinction is actually used).

alter table employees add column leave_jan integer;
alter table employees add column permission_jan integer;
alter table employees add column leave_feb integer;
alter table employees add column permission_feb integer;
alter table employees add column leave_mar integer;
alter table employees add column permission_mar integer;
alter table employees add column leave_apr integer;
alter table employees add column permission_apr integer;
alter table employees add column leave_may integer;
alter table employees add column permission_may integer;
alter table employees add column leave_jun integer;
alter table employees add column permission_jun integer;
alter table employees add column leave_jul integer;
alter table employees add column permission_jul integer;
alter table employees add column leave_aug integer;
alter table employees add column permission_aug integer;
alter table employees add column leave_sep integer;
alter table employees add column permission_sep integer;
alter table employees add column leave_oct integer;
alter table employees add column permission_oct integer;
alter table employees add column leave_nov integer;
alter table employees add column permission_nov integer;
alter table employees add column leave_dec integer;
alter table employees add column permission_dec integer;


-- STEP 2: Migrate your 5 sample employees to have some realistic
-- monthly data, matching the pattern from your screenshot (Jan-Aug
-- filled in, Sep/Oct/Nov/Dec left blank since "today" in this
-- dataset is partway through the year). Adjust or skip this step
-- freely — it's just to give you something to test against
-- immediately. If you've already deleted the sample employees and
-- loaded real data, skip this step entirely.

update employees set
  leave_jan = 1, permission_jan = 1,
  leave_feb = 2, permission_feb = 1,
  leave_mar = 1, permission_mar = 1,
  leave_apr = 0, permission_apr = 0,
  leave_may = 1, permission_may = 1,
  leave_jun = 1, permission_jun = 1
where employee_number = 'EMP001';


-- STEP 3: About the OLD columns (total_working_days, leaves_taken,
-- permissions_taken, leave_balance) — these are intentionally NOT
-- deleted by this script. total_working_days and leave_balance are
-- still genuinely useful (a single "how many working days total"
-- and "how many leave days am I entitled to" number still makes
-- sense as one figure, not 12). leaves_taken and permissions_taken,
-- however, are now CALCULATED on the fly by the website by adding
-- up all 12 months — so those two specific old columns are simply
-- unused going forward. You can leave them as-is (harmless) or
-- remove them later once you're confident the new system works:
--
--   alter table employees drop column leaves_taken;
--   alter table employees drop column permissions_taken;
--
-- (Commented out deliberately — run these two lines yourself,
-- later, only once you've confirmed everything works.)

-- ============================================================
-- DONE. Your employees table now has 24 new monthly columns
-- alongside the existing ones. Next: update js/supabase-config.js
-- is NOT needed again (same database, same connection) — just
-- replace the website files per the new SETUP-INSTRUCTIONS.
-- ============================================================
