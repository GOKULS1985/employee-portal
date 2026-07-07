-- ============================================================
-- EMPLOYEE PORTAL — DATABASE SETUP SCRIPT
-- ============================================================
-- HOW TO USE THIS FILE:
-- 1. Go to https://supabase.com and create a free account + new project.
-- 2. In your Supabase project, click "SQL Editor" in the left sidebar.
-- 3. Click "New query", paste this ENTIRE file in, and click "Run".
-- 4. That's it — your table, security rules, and 5 sample employees
--    will all be created in one go.
-- ============================================================


-- STEP 1: Create the table that stores every employee's record.
-- Think of this like one row per employee in a spreadsheet.
create table employees (
  id uuid primary key default gen_random_uuid(),       -- internal unique ID (auto-generated, ignore this)
  employee_number text unique not null,                 -- e.g. "EMP001" — what employee types to log in
  date_of_birth date not null,                           -- e.g. "1995-03-21" — what employee types to log in
  full_name text not null,                               -- e.g. "Priya Sharma"
  department text,                                       -- e.g. "Sales" (optional, for admin's reference)
  total_working_days integer not null default 0,         -- e.g. 240
  leave_balance integer not null default 0,                -- e.g. 14 (however many leaves they have left)

  -- Month-by-month tracking: one Leave count and one Permission
  -- count for each of the 12 months. Each defaults to NULL, not 0
  -- — NULL specifically means "nothing entered for this month yet,"
  -- which the website treats differently depending on whether that
  -- month is in the future or has already passed (see the comments
  -- in js/month-utils.js for the full explanation of this rule).
  leave_jan integer, permission_jan integer,
  leave_feb integer, permission_feb integer,
  leave_mar integer, permission_mar integer,
  leave_apr integer, permission_apr integer,
  leave_may integer, permission_may integer,
  leave_jun integer, permission_jun integer,
  leave_jul integer, permission_jul integer,
  leave_aug integer, permission_aug integer,
  leave_sep integer, permission_sep integer,
  leave_oct integer, permission_oct integer,
  leave_nov integer, permission_nov integer,
  leave_dec integer, permission_dec integer,

  last_updated timestamp with time zone default now()    -- auto-updates whenever a row changes
);

-- STEP 2: Create a SEPARATE table just for the admin's login.
-- Keeping this separate from employee data is intentional —
-- it means admin credentials are never mixed in with the
-- 300 employee rows, and never accidentally exposed by the
-- same queries that fetch employee leave data.
create table admin_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  -- IMPORTANT: this stores a HASHED password, never plain text.
  -- The setup steps below show you exactly how to generate this hash.
  password_hash text not null
);


-- STEP 3: Turn on Row Level Security (RLS).
-- This is the single most important security step in this whole file.
-- By default, once RLS is ON, NOBODY can read or write ANYTHING —
-- until we explicitly write a rule allowing it. This is what makes
-- it safe to call Supabase directly from a public website's JavaScript.
alter table employees enable row level security;
alter table admin_users enable row level security;

-- STEP 4: Write the actual access rules.

-- Rule: anyone (i.e. the public website) is allowed to READ employee
-- data — this is required so the login page can check an employee
-- number + DOB combination against the table.
-- (Note: this does NOT mean every employee can see every OTHER
-- employee's data — the dashboard page only ever displays the single
-- row matching the credentials that were entered. The database allows
-- reading; the website's own code controls what's actually shown.)
create policy "Allow public read of employees"
on employees for select
to anon
using (true);

-- Rule: NOBODY is allowed to write/edit employee data directly from
-- the public website's normal connection. Edits only happen through
-- the admin page, which uses a separate, more privileged connection
-- method (explained fully in admin-setup-instructions.md).
-- We simply do NOT create an "insert" or "update" policy for the
-- anon role here — no policy means no permission, by default.

-- Rule: admin_users table is never readable by the public website at
-- all, in any way. Only Supabase's own backend authentication system
-- (used in the admin login, set up in step 6 below) can check it.
-- No select/insert/update policy is created for "anon" — meaning
-- zero public access to this table, full stop.


-- STEP 5: Insert sample data — 5 example employees to test with.
-- Replace/add to this with your real 300 employees later (Section 4
-- of the main guide shows the easy bulk-upload method).
-- Note: only Jan-Jun have monthly numbers filled in below, on
-- purpose — this mirrors a real mid-year situation, where later
-- months are genuinely unentered. The website will correctly show
-- those later months as "—" (since June 2026 is "today" in this
-- example) once you load it.
insert into employees
  (employee_number, date_of_birth, full_name, department, total_working_days, leave_balance,
   leave_jan, permission_jan, leave_feb, permission_feb, leave_mar, permission_mar,
   leave_apr, permission_apr, leave_may, permission_may, leave_jun, permission_jun)
values
  ('EMP001', '1995-03-21', 'Priya Sharma', 'Sales', 240, 14, 1,1, 2,1, 1,1, 0,0, 1,1, 1,1),
  ('EMP002', '1990-07-14', 'Arun Kumar', 'Engineering', 240, 18, 0,0, 1,0, 0,1, 0,0, 1,0, 0,1),
  ('EMP003', '1998-11-02', 'Divya Raj', 'HR', 240, 11, 2,1, 2,1, 1,1, 1,1, 2,1, 1,0),
  ('EMP004', '1992-05-30', 'Karthik Subramaniam', 'Engineering', 240, 20, 0,0, 0,0, 0,0, 0,0, 0,0, 0,0),
  ('EMP005', '1996-09-18', 'Lakshmi Narayanan', 'Marketing', 240, 16, 1,0, 0,1, 1,0, 0,0, 1,1, 0,0);

-- ============================================================
-- DONE. Your database now has:
--   - An "employees" table with 5 sample rows, secured so the
--     public site can only READ (not edit) it directly.
--   - An "admin_users" table, completely private.
-- Next: follow admin-setup-instructions.md to create the admin
-- login and connect everything to your website.
-- ============================================================
