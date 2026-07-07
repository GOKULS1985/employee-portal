# Employee Portal — Complete Setup Guide (From Scratch)

This is the full process, start to finish, for setting up your
Employee Portal: a website where 300+ employees log in with their
Employee Number + Date of Birth to see their month-by-month Leave
and Permission record, and HR manages everything through a separate
admin panel — including bulk CSV upload, select-all, and delete.

Follow every section in order. Total time: roughly 60–75 minutes the
first time through.

---

## SECTION 1 — Create your free Supabase account & project

Supabase is where your employee data actually lives — a free,
hosted database. Think of it as the "backend" to your website's
"frontend."

1. Go to **supabase.com** and click **"Start your project."**
2. Sign up (GitHub login is fastest, since you'll need a GitHub
   account in Section 6 anyway).
3. Click **"New project."**
4. Fill in:
   - **Name**: `employee-portal` (or anything you like)
   - **Database password**: generate a strong one and save it
     somewhere safe — you likely won't need it day-to-day.
   - **Region**: whichever is closest to you geographically.
5. Click **"Create new project."** Takes about 2 minutes.

---

## SECTION 2 — Build your database

This single script creates everything: the table structure
(including all 12 months of Leave/Permission tracking), the
security rules, and 5 sample employees to test with.

1. In Supabase, click **SQL Editor** in the left sidebar.
2. Click **+ New query.**
3. Open **`supabase-setup.sql`** (included in this project), select
   all, copy it.
4. Paste into the query tab, click **Run**.
5. You should see **"Success. No rows returned."**
6. Confirm it worked: click **Table Editor → employees**. You
   should see 5 sample rows (Priya Sharma, Arun Kumar, etc.). Scroll
   the table sideways — you'll see columns like `leave_jan`,
   `permission_jan`, all the way through `leave_dec` /
   `permission_dec`.

---

## SECTION 3 — Connect your website's code to this database

This is the step that "links" the frontend you'll publish to the
backend database you just created. Supabase gives you two values to
copy into one file.

1. In Supabase, click the **gear icon** (Project Settings) at the
   bottom of the left sidebar.
2. Click **"General"** in the settings menu. Find **Project ID**
   (something like `hkrraguplnwocmkaxgmz`) and copy it.
3. Build your full Project URL by wrapping that ID like this:
   `https://hkrraguplnwocmkaxgmz.supabase.co`
   (replace with your own actual ID — don't use the example above).
4. Still in Settings, click **"API Keys."**
   - You'll see a key under **"Publishable key"** that starts with
     `sb_publishable_...` — copy this one.
   - *(Note: Supabase recently renamed things. If your dashboard
     instead shows a tab for "Legacy anon, service_role API keys,"
     ignore it — the Publishable key does the same job and is the
     one to use.)*
   - **Never copy the "Secret key"** (starts with `sb_secret_...`)
     into anything on your website — that one must stay private.
5. Open **`js/supabase-config.js`** from this project in a text
   editor.
6. Replace the two placeholder lines:
   ```javascript
   const SUPABASE_URL = "PASTE_YOUR_PROJECT_URL_HERE";
   const SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_PUBLIC_KEY_HERE";
   ```
   with your real Project URL and Publishable key from steps 3–4
   above. Save the file.

**This step is what makes the frontend and backend actually talk to
each other.** Nothing past this point works until it's done.

---

## SECTION 4 — Create the HR / Admin login account

This is a separate, more secure login system from the employee
one — you create the actual account directly in Supabase.

1. In Supabase, click **Authentication** in the left sidebar.
2. Click **Users** tab → **Add user** → **Create new user.**
3. Enter:
   - **Email**: e.g. `hr@yourcompany.com` (doesn't need to be a
     real inbox — it's just what HR types as "Username" on the
     admin login page)
   - **Password**: a strong password for HR to use.
   - Toggle **"Auto Confirm User"** to **ON.**
4. Click **Create user.**
5. One more required step — go back to **SQL Editor → New query**
   and run this:

```sql
create policy "Allow authenticated full access"
on employees for all
to authenticated
using (true)
with check (true);
```

6. Click **Run.** You should see "Success. No rows returned" again.
   This is what lets a logged-in HR account actually save changes,
   not just view them.

---

## SECTION 5 — Add your logo

1. Export your company logo as a `.png` file (square, around
   200×200px works best).
2. Rename it exactly to: `logo.png`
3. Place it inside this project's `assets` folder.
4. That's it — every page already references `assets/logo.png`
   automatically. If you skip this, pages just show the text title
   instead of a broken image icon — no harm either way.

---

## SECTION 6 — Publish to GitHub Pages

This is your free, public web address — no domain needed.

1. Go to **github.com**, create a free account if you don't have
   one.
2. Click **"+"** (top right) → **"New repository."**
3. Name it (e.g. `employee-portal`), set it to **Public**, click
   **"Create repository."**
4. Click **"uploading an existing file."**
5. **Important — how to upload folders correctly:** GitHub's
   drag-and-drop sometimes silently drops subfolders if you drag the
   folder icon itself. To avoid this, **open each folder on your
   computer first, then drag the individual files from inside it**
   into the GitHub upload box — not the folder itself. Do this for
   `css`, `js`, and `assets`. The loose root files
   (`index.html`, `dashboard.html`, `admin.html`) can be dragged
   normally.
6. Once everything's listed in the upload preview, scroll down,
   click **"Commit changes."**
7. Go to the repo's **Settings** tab → **Pages** (left sidebar).
8. Under **Branch**, select **main** and folder **/ (root)**, click
   **Save.**
9. Wait 1–2 minutes, refresh — you'll see: **"Your site is live
   at https://yourusername.github.io/employee-portal/"**

**To confirm the upload included everything:** go back to your
repo's main page. You should see `css`, `js`, and `assets` listed as
folders (not just loose `.html` files). If `css`/`js`/`assets` are
missing from that list, the folder-drag issue from step 5 happened —
go to **Add file → Upload files** again and repeat step 5 more
carefully.

---

## SECTION 7 — Test everything

1. Open your live URL → you should see a styled login page with
   Employee Number and Day/Month/Year dropdowns for Date of Birth.
2. Log in as `EMP001`, DOB **21 March 1995** → should land on a
   dashboard showing a January-through-current-month table, with
   later months showing "—" and running totals at the bottom.
3. Click **Sign out** → confirms logout works.
4. Click **HR / Admin login** → sign in with the email/password from
   Section 4 → you should see a table of all 5 employees with
   calculated Leave/Permission totals and an **Edit Months** button
   per row.
5. Click **Edit Months** on any employee, change a number, save,
   refresh, confirm it stuck.
6. Check the **Select All** checkbox in the table header, confirm
   the **Delete Selected** button shows the right count and is no
   longer greyed out.
7. Once everything above checks out, follow Section 8 to load your
   real 300 employees and remove the 5 sample rows.

---

## SECTION 8 — Load your real employee data

### Option A — One at a time
Click **"+ Add Employee"** in the admin panel for each person, fill
in their details, click **Edit Months** to add their monthly
numbers.

### Option B — Bulk CSV upload (recommended for 300 people)
1. Prepare a spreadsheet with this exact header row:
   ```
   employee_number, date_of_birth, full_name, department, total_working_days, leave_balance, leave_jan, permission_jan, leave_feb, permission_feb, leave_mar, permission_mar, leave_apr, permission_apr, leave_may, permission_may, leave_jun, permission_jun, leave_jul, permission_jul, leave_aug, permission_aug, leave_sep, permission_sep, leave_oct, permission_oct, leave_nov, permission_nov, leave_dec, permission_dec
   ```
2. `date_of_birth` must be `YYYY-MM-DD` format (e.g. `1995-03-21`).
3. Leave any monthly cell blank if that month hasn't happened yet or
   simply hasn't been entered — blank is fine and expected.
4. Save as `.csv`.
5. In `admin.html`, click **Upload CSV**, select your file.
6. You'll see exactly how many employees were added/updated, and a
   list of any specific rows that had a problem and why.

**Going forward**, monthly updates don't require re-uploading
everything — a CSV with just `employee_number` plus that month's two
columns (e.g. just `leave_aug, permission_aug`) updates only August
for those employees, leaving everything else untouched. This is your
fast path for "it's the 1st of the month, let me log last month's
numbers for everyone."

---

## Understanding the "—" vs "0" rule (read once, applies everywhere)

- **A month that hasn't happened yet** (relative to today's real
  date) always shows **"—"** automatically. Nobody enters anything
  for this — the system figures it out on its own.
- **A month that has already happened, with nothing entered**, shows
  **0.**
- **A month with a real number entered** (including a genuine 0)
  shows exactly that number.

This means a month HR forgot to log looks identical to a month
someone genuinely took zero leave — that's the literal, correct
result of "if empty, treat as 0," applied only once a month has
actually occurred.

---

## Day-to-day usage going forward

- **HR updates data**: go to `/admin.html`, log in, either click
  **Edit Months** on a specific employee or use **Upload CSV** for
  bulk monthly updates. Takes seconds, no GitHub involved.
- **Employees check their data**: go to your site's main URL, log in
  with Employee Number + DOB, see their month-by-month table.
- **You never need to touch GitHub again** after the initial
  publish — GitHub Pages just hosts the unchanging website files.
  All changing data lives in Supabase and updates live.

---

## If something doesn't work

- **Login says "incorrect" for data you know is right** → Section 3
  likely wasn't completed correctly. Re-check
  `js/supabase-config.js` has your real URL and key, not placeholder
  text.
- **Page loads with no styling at all (looks like plain black
  text)** → almost always the folder-upload issue from Section 6,
  step 5. Check your repo's file list for `css`/`js`/`assets` as
  actual folders.
- **Admin table loads empty or shows a permission error** → confirm
  the SQL command in Section 4, step 5 was run successfully.
- **Dashboard shows blank for months that already happened, instead
  of 0** → press F12 → Console tab → refresh → look for a red error
  mentioning `month-utils.js` or `MONTHS is not defined`. This
  usually means that file wasn't uploaded, or isn't loading before
  `dashboard.js`/`admin.js` in the HTML's script tags.
- **CSV upload says a column is "unrecognized"** → check your header
  row spelling exactly matches Section 8's list — common mistakes
  are `leave_january` instead of `leave_jan`, or stray spaces.
