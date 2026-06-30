// ============================================================
// ADMIN PANEL LOGIC (admin.html)
// ============================================================
// This file is doing more than login.js / dashboard.js because
// the admin page has two real jobs: (1) a SECURE login for HR
// (not the simple employee-number+DOB pattern — see note below),
// and (2) full editing power over the employees table.
//
// WHY ADMIN LOGIN IS BUILT DIFFERENTLY FROM EMPLOYEE LOGIN:
// Employee login checks a value against a public, readable table.
// That's fine for "let me see my own leave count" — low stakes.
// Admin login controls who can EDIT 300 people's records, so it
// uses Supabase's built-in Authentication system instead — real
// encrypted passwords, real session tokens, the same mechanism
// proper login systems use. You'll create the actual HR login
// account directly in the Supabase dashboard (Section 5 of
// SETUP-INSTRUCTIONS.md shows exactly how) rather than in this
// code, since account creation should not live in public-facing
// JavaScript.
// ============================================================

const adminLoginView = document.getElementById("adminLoginView");
const adminPanelView = document.getElementById("adminPanelView");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminErrorMsg = document.getElementById("adminErrorMsg");
const tableBody = document.getElementById("employeeTableBody");
const saveStatus = document.getElementById("saveStatus");
const searchBox = document.getElementById("searchBox");
const selectAllCheckbox = document.getElementById("selectAllCheckbox");
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
const uploadCsvBtn = document.getElementById("uploadCsvBtn");
const csvFileInput = document.getElementById("csvFileInput");
const deleteModal = document.getElementById("deleteModal");
const deleteModalText = document.getElementById("deleteModalText");
const deleteCancelBtn = document.getElementById("deleteCancelBtn");
const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");

let allEmployees = []; // cache of every employee row, used for client-side search
let selectedIds = new Set(); // employee IDs currently checked via the row checkboxes
let pendingDeleteIds = []; // IDs waiting on confirmation in the modal (set just before showing it)

// ---------- ADMIN LOGIN ----------

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("adminUser").value.trim();
  const password = document.getElementById("adminPass").value;

  adminErrorMsg.textContent = "";

  // Uses Supabase's real authentication system — this checks the
  // password securely on Supabase's servers; the plain password
  // never gets compared against anything in our own code.
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    adminErrorMsg.textContent = "Incorrect username or password.";
    return;
  }

  showAdminPanel();
});

document.getElementById("adminLogoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  adminPanelView.classList.add("hidden");
  adminLoginView.classList.remove("hidden");
});

// On page load, check if HR is already in an active logged-in
// session (e.g. they refreshed the page) — skip straight to the
// panel if so, instead of forcing a re-login.
async function checkExistingSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    showAdminPanel();
  }
}

function showAdminPanel() {
  adminLoginView.classList.add("hidden");
  adminPanelView.classList.remove("hidden");
  loadAllEmployees();
}

// ---------- LOAD + DISPLAY EMPLOYEES ----------

async function loadAllEmployees() {
  // NOTE: this select() call only works for the ADMIN because the
  // admin is logged in through supabaseClient.auth (real
  // authentication), and the RLS policies (set up separately, see
  // Section 5 of SETUP-INSTRUCTIONS.md) grant the "authenticated"
  // role full read/write — unlike the public "anon" role used by
  // the employee login, which can only read.
  const { data, error } = await supabaseClient
    .from("employees")
    .select("*")
    .order("employee_number", { ascending: true });

  if (error) {
    saveStatus.textContent = "Could not load employees: " + error.message;
    saveStatus.classList.add("error");
    return;
  }

  allEmployees = data;
  renderTable(allEmployees);
}

function renderTable(employees) {
  tableBody.innerHTML = "";

  employees.forEach((emp) => {
    const row = document.createElement("tr");
    row.dataset.id = emp.id;
    if (selectedIds.has(emp.id)) row.classList.add("row-selected");

    // totalLeave/totalPermission are calculated from the 12 monthly
    // columns via the shared month-utils.js helper — these are
    // display-only here (not editable inputs), since editing now
    // happens one employee at a time in the month-edit panel below,
    // rather than as 24 separate inline cells in this main table.
    const { totalLeave, totalPermission } = calculateYearTotals(emp);

    row.innerHTML = `
      <td class="checkbox-col"><input type="checkbox" class="row-checkbox" ${selectedIds.has(emp.id) ? "checked" : ""}></td>
      <td><input type="text" value="${emp.employee_number}" data-field="employee_number"></td>
      <td><input type="text" value="${emp.full_name}" data-field="full_name"></td>
      <td><input type="text" value="${emp.department || ""}" data-field="department"></td>
      <td><input type="date" value="${emp.date_of_birth}" data-field="date_of_birth"></td>
      <td><input type="number" value="${emp.total_working_days}" data-field="total_working_days"></td>
      <td><input type="number" value="${emp.leave_balance}" data-field="leave_balance"></td>
      <td class="readonly-total">${totalLeave}</td>
      <td class="readonly-total">${totalPermission}</td>
      <td class="row-actions">
        <button class="icon-btn save">Save</button>
        <button class="icon-btn months">Edit Months</button>
        <button class="icon-btn delete">Delete</button>
      </td>
    `;

    tableBody.appendChild(row);
  });

  // The "select all" checkbox should reflect reality: checked only if
  // every currently-visible row is selected, not just "some are."
  const visibleIds = employees.map((e) => e.id);
  selectAllCheckbox.checked =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
}

// Keeps the "Delete Selected (N)" button's label and enabled/disabled
// state in sync with however many rows are currently checked. Called
// any time a checkbox changes.
function updateDeleteSelectedButton() {
  const count = selectedIds.size;
  deleteSelectedBtn.textContent = `Delete Selected (${count})`;
  deleteSelectedBtn.disabled = count === 0;
}

// ---------- ROW SELECTION (checkboxes) ----------
// Uses event delegation on the table body, same pattern as the
// existing save/delete buttons below — one listener, not one per row.

tableBody.addEventListener("change", (event) => {
  if (!event.target.classList.contains("row-checkbox")) return;
  const row = event.target.closest("tr");
  const employeeId = row.dataset.id;

  if (event.target.checked) {
    selectedIds.add(employeeId);
    row.classList.add("row-selected");
  } else {
    selectedIds.delete(employeeId);
    row.classList.remove("row-selected");
  }

  updateDeleteSelectedButton();
});

selectAllCheckbox.addEventListener("change", () => {
  // "Select all" only affects rows currently visible (i.e. respects
  // an active search filter — selecting all while searching "Sales"
  // shouldn't silently select people outside that search too).
  const visibleRows = tableBody.querySelectorAll("tr");

  visibleRows.forEach((row) => {
    const checkbox = row.querySelector(".row-checkbox");
    const employeeId = row.dataset.id;

    checkbox.checked = selectAllCheckbox.checked;

    if (selectAllCheckbox.checked) {
      selectedIds.add(employeeId);
      row.classList.add("row-selected");
    } else {
      selectedIds.delete(employeeId);
      row.classList.remove("row-selected");
    }
  });

  updateDeleteSelectedButton();
});

// ---------- SAVE / DELETE (using event delegation) ----------
// Rather than attaching a listener to every single button (there
// could be 300+ rows), we attach ONE listener to the whole table
// and figure out which button was clicked. This is both more
// efficient and automatically works for rows added later.

tableBody.addEventListener("click", async (event) => {
  const row = event.target.closest("tr");
  if (!row) return;
  const employeeId = row.dataset.id;

  if (event.target.classList.contains("save")) {
    await saveRow(row, employeeId);
  }

  if (event.target.classList.contains("months")) {
    openMonthEditModal(employeeId);
  }

  if (event.target.classList.contains("delete")) {
    await deleteRow(row, employeeId);
  }
});

async function saveRow(row, employeeId) {
  // Gather every input's current value in this row into one object,
  // e.g. { employee_number: "EMP001", full_name: "Priya Sharma", ... }
  const inputs = row.querySelectorAll("input");
  const updatedData = {};
  inputs.forEach((input) => {
    const field = input.dataset.field;
    // number fields need to be sent as actual numbers, not text
    const isNumberField = input.type === "number";
    updatedData[field] = isNumberField ? Number(input.value) : input.value;
  });
  updatedData.last_updated = new Date().toISOString();

  saveStatus.textContent = "Saving…";
  saveStatus.classList.remove("error");

  const { error } = await supabaseClient
    .from("employees")
    .update(updatedData)
    .eq("id", employeeId);

  if (error) {
    saveStatus.textContent = "Save failed: " + error.message;
    saveStatus.classList.add("error");
    return;
  }

  saveStatus.textContent = `Saved ${updatedData.full_name} at ${new Date().toLocaleTimeString()}`;
}

async function deleteRow(row, employeeId) {
  const name = row.querySelector('[data-field="full_name"]').value;
  openDeleteModal([employeeId], `Remove ${name} from the system?`);
}

// ---------- DELETE CONFIRMATION MODAL ----------
// Both single-row delete and the bulk "Delete Selected" button route
// through this same modal — there is no path in this code that
// deletes a record without the person explicitly confirming first.

function openDeleteModal(employeeIds, message) {
  pendingDeleteIds = employeeIds;
  deleteModalText.textContent = message;
  deleteModal.classList.remove("hidden");
}

function closeDeleteModal() {
  pendingDeleteIds = [];
  deleteModal.classList.add("hidden");
}

deleteCancelBtn.addEventListener("click", closeDeleteModal);

// Also allow clicking the dark overlay itself to back out, same as Cancel.
deleteModal.addEventListener("click", (event) => {
  if (event.target === deleteModal) closeDeleteModal();
});

deleteConfirmBtn.addEventListener("click", async () => {
  if (pendingDeleteIds.length === 0) return;

  saveStatus.textContent = "Deleting…";
  saveStatus.classList.remove("error");

  const { error } = await supabaseClient
    .from("employees")
    .delete()
    .in("id", pendingDeleteIds);

  if (error) {
    saveStatus.textContent = "Delete failed: " + error.message;
    saveStatus.classList.add("error");
    closeDeleteModal();
    return;
  }

  const deletedCount = pendingDeleteIds.length;

  // Remove the deleted rows from our local cache and selection set,
  // then re-render — this avoids a full reload from the database.
  allEmployees = allEmployees.filter((emp) => !pendingDeleteIds.includes(emp.id));
  pendingDeleteIds.forEach((id) => selectedIds.delete(id));

  renderTable(allEmployees);
  updateDeleteSelectedButton();
  saveStatus.textContent = `Deleted ${deletedCount} employee${deletedCount === 1 ? "" : "s"}.`;
  closeDeleteModal();
});

deleteSelectedBtn.addEventListener("click", () => {
  const count = selectedIds.size;
  if (count === 0) return;

  const names = allEmployees
    .filter((emp) => selectedIds.has(emp.id))
    .map((emp) => emp.full_name);

  // For a large selection, listing every name would be unreadable —
  // show the first few and summarize the rest.
  const preview =
    names.length <= 4
      ? names.join(", ")
      : `${names.slice(0, 4).join(", ")}, and ${names.length - 4} more`;

  openDeleteModal(
    Array.from(selectedIds),
    `Remove ${count} employee${count === 1 ? "" : "s"} (${preview})?`
  );
});

// ---------- MONTH-BY-MONTH EDIT PANEL ----------
// Opens a focused view of ONE employee's 12 months at a time,
// rather than 24 separate always-visible inline columns in the
// main table — the main table stays readable with 300 rows, and
// editing a specific employee's specific month stays simple too.

const monthEditModal = document.getElementById("monthEditModal");
const monthEditTitle = document.getElementById("monthEditTitle");
const monthEditSubtitle = document.getElementById("monthEditSubtitle");
const monthEditTableBody = document.getElementById("monthEditTableBody");
const monthEditCancelBtn = document.getElementById("monthEditCancelBtn");
const monthEditSaveBtn = document.getElementById("monthEditSaveBtn");

let monthEditEmployeeId = null; // which employee's months are currently open in the panel

function openMonthEditModal(employeeId) {
  const employee = allEmployees.find((emp) => emp.id === employeeId);
  if (!employee) return;

  monthEditEmployeeId = employeeId;
  monthEditTitle.textContent = `${employee.full_name}'s monthly record`;
  monthEditSubtitle.textContent = `${employee.employee_number} · ${employee.department || "—"}`;

  monthEditTableBody.innerHTML = "";

  MONTHS.forEach((month, index) => {
    const monthNumber = index + 1;
    const isFuture = isMonthInFuture(monthNumber);

    const leaveRaw = employee[`leave_${month.key}`];
    const permissionRaw = employee[`permission_${month.key}`];

    // Inputs for future months are disabled — there's nothing
    // meaningful to enter for a month that hasn't happened, and
    // disabling (rather than just leaving editable-but-pointless)
    // makes that visually obvious to whoever's editing.
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${month.label}${isFuture ? ' <span class="future-tag">upcoming</span>' : ""}</td>
      <td>
        <input
          type="number"
          min="0"
          class="month-input"
          data-month="${month.key}"
          data-category="leave"
          value="${leaveRaw === null || leaveRaw === undefined ? "" : leaveRaw}"
          placeholder="${isFuture ? "—" : "0"}"
          ${isFuture ? "disabled" : ""}
        >
      </td>
      <td>
        <input
          type="number"
          min="0"
          class="month-input"
          data-month="${month.key}"
          data-category="permission"
          value="${permissionRaw === null || permissionRaw === undefined ? "" : permissionRaw}"
          placeholder="${isFuture ? "—" : "0"}"
          ${isFuture ? "disabled" : ""}
        >
      </td>
    `;
    monthEditTableBody.appendChild(row);
  });

  monthEditModal.classList.remove("hidden");
}

function closeMonthEditModal() {
  monthEditEmployeeId = null;
  monthEditModal.classList.add("hidden");
}

monthEditCancelBtn.addEventListener("click", closeMonthEditModal);

monthEditModal.addEventListener("click", (event) => {
  if (event.target === monthEditModal) closeMonthEditModal();
});

monthEditSaveBtn.addEventListener("click", async () => {
  if (!monthEditEmployeeId) return;

  // Gather every (non-disabled, i.e. non-future) input in the panel
  // into the update object. A blank box is sent as null (meaning
  // "not entered, treat per the future/past rule"), not 0 — this
  // preserves the distinction between "HR explicitly entered 0" and
  // "HR hasn't gotten to this month yet," even though both currently
  // DISPLAY as 0 on the dashboard once the month has passed. Keeping
  // that distinction in the database (rather than collapsing it at
  // save time) means future logic — like flagging genuinely
  // unentered months for HR's attention — stays possible later.
  const updatedData = {};
  const inputs = monthEditTableBody.querySelectorAll(".month-input:not(:disabled)");

  inputs.forEach((input) => {
    const columnName = `${input.dataset.category}_${input.dataset.month}`;
    const value = input.value.trim();
    updatedData[columnName] = value === "" ? null : Number(value);
  });

  updatedData.last_updated = new Date().toISOString();

  saveStatus.textContent = "Saving monthly record…";
  saveStatus.classList.remove("error");

  const { error } = await supabaseClient
    .from("employees")
    .update(updatedData)
    .eq("id", monthEditEmployeeId);

  if (error) {
    saveStatus.textContent = "Save failed: " + error.message;
    saveStatus.classList.add("error");
    return;
  }

  // Update the local cache so the main table's calculated YTD totals
  // refresh immediately, without needing a full re-fetch.
  const employeeIndex = allEmployees.findIndex((emp) => emp.id === monthEditEmployeeId);
  if (employeeIndex !== -1) {
    allEmployees[employeeIndex] = { ...allEmployees[employeeIndex], ...updatedData };
  }

  renderTable(allEmployees);
  saveStatus.textContent = "Monthly record saved.";
  closeMonthEditModal();
});

// ---------- ADD NEW EMPLOYEE ----------

document.getElementById("addEmployeeBtn").addEventListener("click", async () => {
  const newEmployee = {
    employee_number: "NEW" + Math.floor(Math.random() * 1000),
    full_name: "New Employee",
    department: "",
    date_of_birth: "2000-01-01",
    total_working_days: 0,
    leave_balance: 0,
    // The 24 monthly leave_/permission_ columns are deliberately left
    // out here — Supabase will store them as null automatically,
    // which correctly means "nothing entered yet" for every month.
    // HR fills these in afterward via the "Edit Months" button.
  };

  const { data, error } = await supabaseClient
    .from("employees")
    .insert(newEmployee)
    .select()
    .single();

  if (error) {
    saveStatus.textContent = "Could not add employee: " + error.message;
    saveStatus.classList.add("error");
    return;
  }

  allEmployees.push(data);
  renderTable(allEmployees);
  saveStatus.textContent = "New employee added — edit their details and click Save.";
});

// ---------- SEARCH ----------

searchBox.addEventListener("input", () => {
  const query = searchBox.value.toLowerCase().trim();
  const filtered = allEmployees.filter(
    (emp) =>
      emp.full_name.toLowerCase().includes(query) ||
      emp.employee_number.toLowerCase().includes(query)
  );
  renderTable(filtered);
});

// ---------- CSV UPLOAD ----------
// Clicking the visible "Upload CSV" button triggers the actual
// (hidden) file input — this is a common pattern since file inputs
// are hard to style directly, so we hide the real one and trigger
// it from a normal button instead.

uploadCsvBtn.addEventListener("click", () => csvFileInput.click());

csvFileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const text = await file.text();
  const { rows, errors: parseErrors } = parseCsv(text);

  if (rows.length === 0) {
    saveStatus.textContent = "No valid rows found in that CSV.";
    saveStatus.classList.add("error");
    csvFileInput.value = ""; // reset so the same file can be re-selected later if needed
    return;
  }

  // Guard against the one real failure mode a slim "monthly update
  // only" CSV can hit: a row whose employee_number does NOT already
  // exist (so it would INSERT a brand-new employee) but is missing
  // full_name or date_of_birth — both required by the database for
  // any employee to exist at all, and date_of_birth specifically is
  // how that person would ever log in. Caught and explained HERE,
  // before the database call, rather than surfacing as a generic
  // database error that wouldn't say which rows or why.
  const existingNumbers = new Set(allEmployees.map((emp) => emp.employee_number));
  const invalidNewRows = rows.filter(
    (row) =>
      !existingNumbers.has(row.employee_number) &&
      (!row.full_name || !row.date_of_birth)
  );

  if (invalidNewRows.length > 0) {
    const numbers = invalidNewRows.map((r) => r.employee_number).join(", ");
    saveStatus.textContent = "Upload stopped — see details.";
    saveStatus.classList.add("error");
    alert(
      `These employee_number(s) don't exist yet, and this CSV doesn't include full_name + date_of_birth for them, which are required to create a new employee:\n\n${numbers}\n\nEither add those columns for these rows, or remove these rows if you only meant to update existing employees.`
    );
    csvFileInput.value = "";
    return;
  }

  saveStatus.textContent = `Uploading ${rows.length} row${rows.length === 1 ? "" : "s"}…`;
  saveStatus.classList.remove("error");

  // "Upsert" = update the row if employee_number already exists,
  // otherwise insert it as new. This is exactly the behavior
  // described in the help text above the table: re-uploading a
  // corrected CSV updates existing people rather than duplicating
  // them. Supabase's upsert needs to know WHICH column counts as
  // "the same row" — here, employee_number, since that's the one
  // guaranteed-unique human-meaningful field (the database's
  // internal id is auto-generated and won't appear in a CSV).
  const { data, error } = await supabaseClient
    .from("employees")
    .upsert(rows, { onConflict: "employee_number" })
    .select();

  csvFileInput.value = ""; // reset the file input either way, so re-uploading the same filename later works

  if (error) {
    saveStatus.textContent = "Upload failed: " + error.message;
    saveStatus.classList.add("error");
    return;
  }

  await loadAllEmployees(); // full reload, since an upsert of 300 rows is simpler to just re-fetch than to merge by hand

  let statusMessage = `Uploaded successfully: ${data.length} employee${data.length === 1 ? "" : "s"} added or updated.`;
  if (parseErrors.length > 0) {
    statusMessage += ` (${parseErrors.length} row${parseErrors.length === 1 ? "" : "s"} skipped — see below.)`;
  }
  saveStatus.textContent = statusMessage;

  if (parseErrors.length > 0) {
    // Skipped rows are surfaced via a simple browser alert rather
    // than silently vanishing — for 300 rows it matters that HR
    // knows exactly which ones didn't make it in and why.
    alert("Some rows were skipped:\n\n" + parseErrors.join("\n"));
  }
});

// Parses raw CSV text into an array of employee objects ready for
// upsert, plus a list of human-readable problems for any row that
// couldn't be used. Deliberately simple (no external library) since
// the expected format is fixed and well-documented in the help text.
//
// DESIGN NOTE: only employee_number and date_of_birth are required
// in every row (date_of_birth is required because it's how
// employees log in). Every OTHER column — full_name, department,
// total_working_days, leave_balance, and all 24 monthly columns —
// is OPTIONAL on a per-row basis. This deliberately supports two
// real workflows with one parser: a full CSV when first loading
// 300 employees, AND a slim "just this month's numbers" CSV for
// ongoing monthly updates (matching your screenshot's actual
// format, which only had employee_number/date_of_birth/full_name/
// department plus the monthly columns — no total_working_days or
// leave_balance at all). A column simply isn't touched if the CSV
// doesn't include it, leaving whatever was already saved in place.
function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { rows: [], errors: ["File has no data rows below the header."] };
  }

  // Every recognized column name. Anything in the uploaded CSV's
  // header that ISN'T in this list is flagged as a warning (likely
  // a typo) rather than silently ignored.
  const monthlyColumns = [];
  MONTHS.forEach((month) => {
    monthlyColumns.push(`leave_${month.key}`, `permission_${month.key}`);
  });
  const allRecognizedColumns = [
    "employee_number",
    "date_of_birth",
    "full_name",
    "department",
    "total_working_days",
    "leave_balance",
    ...monthlyColumns,
  ];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows = [];
  const errors = [];

  const unrecognizedColumns = header.filter((col) => !allRecognizedColumns.includes(col));
  if (unrecognizedColumns.length > 0) {
    errors.push(`Unrecognized column header(s), ignored: ${unrecognizedColumns.join(", ")}.`);
  }

  // Process every line after the header.
  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1; // +1 so error messages reference the actual line number a person would see in a spreadsheet
    const values = lines[i].split(",").map((v) => v.trim());

    if (values.length !== header.length) {
      errors.push(`Line ${lineNumber}: expected ${header.length} columns (matching the header row), found ${values.length}.`);
      continue;
    }

    // Build an object keyed by the file's own header row, so column
    // order in the uploaded file doesn't have to match any fixed
    // order — only the column NAMES (and which ones are present at
    // all) matter.
    const rawRow = {};
    header.forEach((colName, index) => {
      rawRow[colName] = values[index];
    });

    if (!rawRow.employee_number) {
      errors.push(`Line ${lineNumber}: employee_number is empty — this row was skipped entirely.`);
      continue;
    }

    // date_of_birth is required ONLY if this CSV includes that
    // column at all (a monthly-only update CSV may reasonably omit
    // it, since it's not changing). If the column IS present, it
    // must be valid — a malformed DOB silently breaking someone's
    // login later is exactly the kind of error worth catching now.
    if ("date_of_birth" in rawRow) {
      const dobPattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!dobPattern.test(rawRow.date_of_birth)) {
        errors.push(`Line ${lineNumber} (${rawRow.employee_number}): date_of_birth "${rawRow.date_of_birth}" is not in YYYY-MM-DD format.`);
        continue;
      }
    }

    // Every numeric-style column (working days, leave balance, and
    // all 24 monthly columns) is validated the same way: a genuinely
    // BLANK cell becomes null (meaning "not entered" — exactly what
    // lets future months stay blank and lets HR skip months they
    // haven't gotten to). A cell with TEXT in it that isn't a valid
    // number is a real error, not silently treated as blank.
    const numericColumns = ["total_working_days", "leave_balance", ...monthlyColumns];
    const numericValues = {};
    let hasNumericError = false;

    numericColumns.forEach((col) => {
      if (!(col in rawRow)) return; // column not present in this CSV at all — leave untouched
      const cellText = rawRow[col];

      if (cellText === "" || cellText === "-") {
        numericValues[col] = null; // explicitly blank or a dash — "not entered"
        return;
      }

      const num = Number(cellText);
      if (Number.isNaN(num)) {
        errors.push(`Line ${lineNumber} (${rawRow.employee_number}): "${col}" value "${cellText}" is not a number.`);
        hasNumericError = true;
      } else {
        numericValues[col] = num;
      }
    });

    if (hasNumericError) continue;

    // Build the final row object, only including keys that were
    // actually present in this CSV — this is what makes a
    // monthly-only update CSV correctly leave full_name,
    // total_working_days, etc. untouched on existing employees
    // rather than overwriting them with blanks.
    const finalRow = { employee_number: rawRow.employee_number };
    if ("date_of_birth" in rawRow) finalRow.date_of_birth = rawRow.date_of_birth;
    if ("full_name" in rawRow) finalRow.full_name = rawRow.full_name;
    if ("department" in rawRow) finalRow.department = rawRow.department || null;
    numericColumns.forEach((col) => {
      if (col in numericValues) finalRow[col] = numericValues[col];
    });
    finalRow.last_updated = new Date().toISOString();

    rows.push(finalRow);
  }

  return { rows, errors };
}

// ---------- INITIALIZE ----------
checkExistingSession();
