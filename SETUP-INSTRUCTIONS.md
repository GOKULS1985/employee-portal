# Employee Portal — Complete Setup Instructions

This guide walks you through every step, in order, from zero to a live
website. Follow them top to bottom — later steps depend on earlier ones.

Total time: roughly 45–60 minutes the first time.

---

## SECTION 1 — Create your free Supabase account & project

1. Go to **https://supabase.com** and click **"Start your project"**.
2. Sign up (GitHub login is fastest, since you'll need a GitHub
   account in Section 6 anyway).
3. Click **"New project"**.
4. Fill in:
   - **Name**: `employee-portal` (or anything you like)
   - **Database password**: generate a strong one and **save it
     somewhere safe** — you likely won't need it day-to-day, but you
     may need it later for advanced changes.
   - **Region**: pick whichever is geographically closest to you.
5. Click **"Create new project"**. It takes about 2 minutes to set up
   — Supabase will show a loading screen.

---

## SECTION 2 — Build your database (run the SQL script)

1. Once your project is ready, click **"SQL Editor"** in the left
   sidebar (icon looks like `</>`)
2. Click **"+ New query"**.
3. Open the file **`supabase-setup.sql`** (included in this project),
   select all, copy it.
4. Paste it into the SQL Editor and click **"Run"** (bottom right, or
   Ctrl/Cmd + Enter).
5. You should see "Success. No rows returned" — that's correct, it
   means the table and security rules were created.
6. To confirm it worked: click **"Table Editor"** in the left
   sidebar → click **"employees"** → you should see 5 sample rows
   (Priya Sharma, Arun Kumar, etc.)

---

## SECTION 3 — Connect your website's code to this database

1. In Supabase, click the **gear icon** (Project Settings) in the
   bottom of the left sidebar.
2. Click **"API"** in the settings menu.
3. You'll see two values you need:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **Project API keys → `anon` `public`** (a long string of letters
     and numbers)
4. Open the file **`js/supabase-config.js`** in this project.
5. Replace:
   - `PASTE_YOUR_PROJECT_URL_HERE` with your Project URL
   - `PASTE_YOUR_ANON_PUBLIC_KEY_HERE` with your anon public key
6. Save the file.

**This single step is what "connects frontend and backend"** — every
other file in this project reads these two values to know which
database to talk to. Everything past this point will not work until
this step is done correctly.

---

## SECTION 4 — Add your real employee data

You have two options:

### Option A — Add employees one at a time (fine for small additions)
Once the site is live (after Section 6), open `admin.html`, log in,
and click **"+ Add Employee"** for each person, filling in their
details and clicking Save.

### Option B — Bulk import all 300 at once (recommended for the initial load)
1. Prepare a spreadsheet (Excel or Google Sheets) with these exact
   column headers in this exact order:
   `employee_number, date_of_birth, full_name, department, total_working_days, leaves_taken, permissions_taken, leave_balance`
2. Make sure `date_of_birth` is formatted as `YYYY-MM-DD` (e.g.
   `1995-03-21`) in every row.
3. Export/save it as a **CSV file**.
4. In Supabase, go to **Table Editor → employees**.
5. Click **"Insert"** dropdown (top right) → **"Import data from
   CSV"**.
6. Upload your file, confirm the column mapping looks correct, click
   **Import**.
7. All 300 rows will appear in seconds.

---

## SECTION 5 — Create the HR / Admin login account

This is a separate, more secure login system from the employee one
(explained in `js/admin.js`'s comments) — you create the actual
account directly in Supabase rather than in code.

1. In Supabase, click **"Authentication"** in the left sidebar.
2. Click **"Users"** tab → **"Add user"** → **"Create new user"**.
3. Enter:
   - **Email**: e.g. `hr@yourcompany.com` (this becomes the
     "Username" typed on the admin login page — it doesn't need to be
     a real, working email inbox, just needs to look like one)
   - **Password**: choose a strong password for HR to use.
   - Toggle **"Auto Confirm User"** to ON (important — skips email
     verification, which you don't need for an internal tool).
4. Click **"Create user"**.
5. **One more required step** — by default, Supabase's security
   rules don't yet say what a logged-in admin is allowed to do. Go
   back to **SQL Editor → New query** and run this:

```sql
-- Allows any logged-in (authenticated) user — i.e. HR, once they've
-- signed in via admin.html — to add, edit, and delete employee rows.
create policy "Allow authenticated full access"
on employees for all
to authenticated
using (true)
with check (true);
```

6. Click **Run**. Admin editing will now work end-to-end.

---

## SECTION 6 — Put your logo in

1. Find/export your company logo as a `.png` file (square logos
   look best — e.g. 200×200px).
2. Rename it exactly to: `logo.png`
3. Place it inside the `assets` folder, replacing nothing (the
   folder is currently empty and waiting for this file).
4. That's it — `index.html`, `dashboard.html`, and `admin.html` all
   already reference `assets/logo.png` and will pick it up
   automatically. If you don't add a logo, the pages simply won't
   show a broken image icon (this was built in deliberately) — they
   just show the text title instead.

---

## SECTION 7 — Publish to GitHub Pages (free hosting, no domain needed)

1. Go to **https://github.com** and create a free account if you
   don't have one.
2. Click the **"+"** icon (top right) → **"New repository"**.
3. Name it (e.g. `employee-portal`), set it to **Public** (required
   for free GitHub Pages), click **"Create repository"**.
4. On the next screen, click **"uploading an existing file"**.
5. Drag in **every file and folder** from this project (`index.html`,
   `dashboard.html`, `admin.html`, the `css`, `js`, and `assets`
   folders — you do **not** need to upload `supabase-setup.sql` or
   this instructions file, though it's harmless if you do).
6. Scroll down, click **"Commit changes"**.
7. Click **"Settings"** tab (top of the repo) → **"Pages"** (left
   sidebar).
8. Under **"Branch"**, select **`main`** and folder **`/ (root)`**,
   click **"Save"**.
9. Wait about 1–2 minutes, then refresh the page. You'll see: **"Your
   site is live at https://yourusername.github.io/employee-portal/"**
10. That URL is your real, working website. Share it with your
    employees.

---

## SECTION 8 — Test everything before rolling out

1. Open your live URL → you should see the login page.
2. Log in as a sample employee: Employee Number `EMP001`, Date of
   Birth `1995-03-21` → should land on a dashboard showing Priya
   Sharma's stats.
3. Click "Sign out" → you should return to login.
4. Click "HR / Admin login" → sign in with the email/password from
   Section 5 → you should see all 5 sample employees in an editable
   table.
5. Edit one row's "Leaves Taken" number, click **Save** → refresh the
   page → confirm the new number stayed.
6. Once confirmed, follow Section 4 to load your real 300 employees
   and delete the 5 sample rows from Table Editor in Supabase.

---

## Day-to-day usage going forward

- **HR updates leave data**: go to your site's `/admin.html` page,
  log in, edit any cell, click Save. Takes seconds, no code, no
  GitHub involved at all.
- **Employees check their data**: go to your site's main URL, log in
  with Employee Number + DOB, view their stats.
- **You never need to touch GitHub again** after the initial upload
  — GitHub Pages is just hosting the unchanging website files. All
  the changing data lives in Supabase and updates live, instantly,
  with no redeployment.

---

## If something doesn't work

- **Login page says "incorrect" for data you know is right** → most
  likely Section 3 wasn't completed correctly. Double check
  `js/supabase-config.js` has your real URL and key, not the
  placeholder text.
- **Admin table loads empty / shows a permission error** → check that
  the SQL command in Section 5, step 5 was run successfully.
- **Employee can see the page but stats show blank/dashes** →
  usually means their session data didn't carry over; have them log
  out and back in.
