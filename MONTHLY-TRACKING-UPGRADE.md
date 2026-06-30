# Monthly Leave & Permission Tracking — Upgrade Guide

This upgrades your existing, already-working Employee Portal to track
Leave and Permission separately for each of the 12 months, exactly
matching the spreadsheet format you provided — instead of one single
running total.

This is an UPGRADE on top of what you already built, not a fresh
start. Your existing employees, logins, and setup all stay intact.

---

## What's new, in one paragraph

Each employee's record now has 24 new fields — a Leave count and a
Permission count for January through December — instead of one
overall "leaves taken" number. The employee dashboard shows a full
month-by-month table (matching your second screenshot) with running
totals at the bottom. The admin panel shows each employee as one
summary row with calculated totals, and HR clicks "Edit Months" to
open a focused panel for entering/editing that one employee's 12
months. CSV upload now accepts the monthly format too, and works
both for loading everyone fresh AND for quick "just update this
month's numbers" uploads going forward.

---

## SECTION 1 — Run the database migration

1. Go to your Supabase project → **SQL Editor** → **+ New query**.
2. Open **`migration-monthly-tracking.sql`** (included in this
   update), select all, copy it.
3. Paste into the new query tab, click **Run**.
4. You should see "Success. No rows returned" — this means 24 new
   columns were added to your `employees` table without touching
   any of your existing data.
5. To confirm: go to **Table Editor → employees** — scroll right and
   you should see new columns like `leave_jan`, `permission_jan`,
   `leave_feb`, and so on, all the way to `leave_dec` /
   `permission_dec`.

**Your existing employees are untouched.** Their existing
information (name, department, DOB, working days, leave balance)
stays exactly as it was. The 24 new monthly columns simply start out
empty for everyone — you'll fill them in via Section 3 below.

---

## SECTION 2 — Replace 5 files on GitHub

Six files changed in this update. Three are brand new, three are
updates to files you already have.

**New files** (need to be added to your repo for the first time):
- `js/month-utils.js`

**Updated files** (replace the existing version on GitHub):
- `dashboard.html`
- `js/dashboard.js`
- `admin.html`
- `js/admin.js`
- `css/style.css`

### How to update each file on GitHub:

For files that already exist in your repo:
1. Go to your repo, click the file (e.g. `dashboard.html`).
2. Click the pencil icon (top right of the file view) to edit.
3. Select all the existing content, delete it.
4. Open the new version of that file from this update, copy its
   entire content, paste it in.
5. Scroll down, click **"Commit changes"**.
6. Repeat for each of the 5 updated files.

For the one new file (`js/month-utils.js`):
1. Go to your repo, navigate into the `js` folder.
2. Click **"Add file" → "Create new file"**.
3. Name it exactly: `month-utils.js`
4. Paste in its full content.
5. Click **"Commit changes"**.

After all 6 files are committed, give GitHub Pages a minute, then
hard-refresh your live site (Ctrl+F5) before testing.

---

## SECTION 3 — Enter your first month of real data

You have two ways to do this, same as before:

### Option A — One employee at a time, through the admin panel
1. Log into `admin.html`.
2. Find the employee, click **"Edit Months"** in their row.
3. A panel opens showing all 12 months. Months that haven't happened
   yet (relative to today's real date) are greyed out and locked —
   there's nothing to enter for a month that hasn't occurred.
4. Type the Leave and Permission numbers for each month that has
   occurred. Leave a box blank if you genuinely haven't tallied that
   month yet — it'll show as 0 on the dashboard for now (per your
   rule), and you can come back and fill it in later without losing
   anything else you've entered.
5. Click **"Save monthly record"**.

### Option B — Bulk upload via CSV (recommended for 300 employees)
1. Prepare a spreadsheet with these column headers:
   `employee_number, date_of_birth, full_name, department, leave_jan, permission_jan, leave_feb, permission_feb, leave_mar, permission_mar, leave_apr, permission_apr, leave_may, permission_may, leave_jun, permission_jun, leave_jul, permission_jul, leave_aug, permission_aug, leave_sep, permission_sep, leave_oct, permission_oct, leave_nov, permission_nov, leave_dec, permission_dec`

   This matches your screenshot's layout — exactly the format you
   already have.
2. Save as CSV.
3. In `admin.html`, click **"Upload CSV"**, select your file.
4. The system tells you exactly how many employees were
   added/updated, and lists any specific rows it couldn't use and
   why (so nothing fails silently).

**Going forward, monthly updates are even simpler**: you don't need
to re-upload everything every month. A CSV containing just
`employee_number` plus that month's two columns (e.g. just
`leave_jul, permission_jul`) will update only July's numbers for
those employees, leaving everything else exactly as it was. This is
the fast path for "it's the start of August, let me log July's
leave for everyone."

---

## SECTION 4 — Understand the "—" vs "0" behavior (read this once)

This is the one piece of logic worth understanding clearly, since
it's not just a display quirk — it's the actual rule you asked for.

- **A month that hasn't happened yet** (e.g. it's June 2026 and
  you're looking at October) always shows **"—"**, automatically,
  with no action needed from HR. The system knows today's real date
  and figures this out on its own.
- **A month that has already happened, but nothing was entered for
  it**, shows **0**. This matches exactly what you specified:
  "if the column is empty, consider it 0."
- **A month with a real entered number** (including a genuine 0,
  like someone who took zero leave that month) shows that number
  exactly.

The practical effect: if HR forgets to enter March's numbers, an
employee checking their dashboard in April will see "0" for March —
indistinguishable from someone who genuinely took 0 leave in March.
This is the literal, correct application of the rule you gave. If
you'd ever want a visibly different state for "HR hasn't entered
this yet" specifically (so it doesn't look identical to a true
zero), that's a small, separate addition we can make later — just
flag it.

---

## SECTION 5 — Test before relying on this

1. Log in as `EMP001` on the employee side. You should see a
   month-by-month table, January through whatever the current month
   is, plus running totals at the bottom matching your second
   screenshot's layout.
2. Confirm any month after today's real date shows "—", and any
   filled-in past month shows the right numbers.
3. Log into `admin.html`, click **"Edit Months"** on any employee,
   change one month's number, save, and confirm it reflects
   correctly both in the admin table's totals and on that employee's
   own dashboard.
4. Test **Select All** → confirm the checkbox in the header selects
   every visible row, and the "Delete Selected" button's count
   updates correctly.
5. Test the CSV upload with a small 2-3 row file first, before
   uploading all 300 — confirms the format is right before
   committing to the full batch.
6. Test on an actual phone (or your browser's mobile view, F12 →
   the phone/tablet icon) — confirm the month-edit panel and tables
   are usable, not cut off or overlapping.

---

## If something doesn't work

- **Dashboard shows blank/dashes for months that already
  happened** → most likely `js/month-utils.js` wasn't uploaded, or
  wasn't linked in the HTML's `<script>` tags. Check browser
  Console (F12) for a red error mentioning `MONTHS is not defined`
  or similar — that confirms this exact cause.
- **Admin table's "Edit Months" button does nothing** → same
  likely cause as above; `month-utils.js` needs to load before
  `admin.js` in `admin.html`'s script tags, in that order.
- **CSV upload says columns are "unrecognized"** → check your
  header row spelling exactly matches the column names listed in
  Section 3 — common slip-ups are `leave_january` instead of
  `leave_jan`, or extra spaces in header names.
