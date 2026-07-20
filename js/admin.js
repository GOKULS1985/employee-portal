// ============================================================
// ADMIN PANEL LOGIC (admin.html)
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
const monthEditModal = document.getElementById("monthEditModal");
const monthEditTitle = document.getElementById("monthEditTitle");
const monthEditSubtitle = document.getElementById("monthEditSubtitle");
const monthEditTableBody = document.getElementById("monthEditTableBody");
const monthEditCancelBtn = document.getElementById("monthEditCancelBtn");
const monthEditSaveBtn = document.getElementById("monthEditSaveBtn");

let allEmployees = [];
let selectedIds = new Set();
let pendingDeleteIds = [];
let monthEditEmployeeId = null;

// ---------- ADMIN LOGIN ----------

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("adminUser").value.trim();
  const password = document.getElementById("adminPass").value;
  adminErrorMsg.textContent = "";

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
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

async function checkExistingSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) showAdminPanel();
}

function showAdminPanel() {
  adminLoginView.classList.add("hidden");
  adminPanelView.classList.remove("hidden");
  loadAllEmployees();
}

// ---------- LOAD + DISPLAY EMPLOYEES ----------

async function loadAllEmployees() {
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

    const { totalLeave, totalPermission } = calculateYearTotals(emp);

    // Safely escape values to prevent any HTML injection
    const safe = (v) => String(v ?? "").replace(/"/g, "&quot;").replace(/</g, "&lt;");

    row.innerHTML = `
      <td class="checkbox-col"><input type="checkbox" class="row-checkbox" ${selectedIds.has(emp.id) ? "checked" : ""}></td>
      <td><input type="text" value="${safe(emp.employee_number)}" data-field="employee_number"></td>
      <td><input type="text" value="${safe(emp.full_name)}" data-field="full_name"></td>
      <td><input type="text" value="${safe(emp.department)}" data-field="department"></td>
      <td><input type="date" value="${safe(emp.date_of_birth)}" data-field="date_of_birth"></td>
      <td><input type="number" step="0.5" min="0" value="${safe(emp.total_working_days)}" data-field="total_working_days"></td>
      <td><input type="text" value="${safe(emp.pf_number)}" data-field="pf_number" placeholder="PF number"></td>
      <td><input type="text" value="${safe(emp.esi_number)}" data-field="esi_number" placeholder="ESI number"></td>
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

  const visibleIds = employees.map((e) => e.id);
  selectAllCheckbox.checked =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
}

// ---------- CHECKBOXES ----------

function updateDeleteSelectedButton() {
  const count = selectedIds.size;
  deleteSelectedBtn.textContent = `Delete Selected (${count})`;
  deleteSelectedBtn.disabled = count === 0;
}

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

// ---------- SAVE ROW ----------

tableBody.addEventListener("click", async (event) => {
  const row = event.target.closest("tr");
  if (!row) return;
  const employeeId = row.dataset.id;
  if (event.target.classList.contains("save")) await saveRow(row, employeeId);
  if (event.target.classList.contains("months")) openMonthEditModal(employeeId);
  if (event.target.classList.contains("delete")) await deleteRow(row, employeeId);
});

async function saveRow(row, employeeId) {
  const inputs = row.querySelectorAll("input");
  const updatedData = {};
  let validationError = null;

  inputs.forEach((input) => {
    if (!input.dataset.field) return; // skip the checkbox input which has no data-field
    const field = input.dataset.field;
    const isNumberField = input.type === "number";

    if (isNumberField) {
      const raw = input.value.trim();
      if (raw === "") {
        updatedData[field] = 0; // default empty number fields to 0
        return;
      }
      const parsed = parseFloat(raw);
      if (Number.isNaN(parsed)) {
        validationError = `"${raw}" is not a valid number in the ${field.replace(/_/g, " ")} field.`;
        return;
      }
      updatedData[field] = parsed;
    } else {
      updatedData[field] = input.value || null;
    }
  });

  if (validationError) {
    saveStatus.textContent = validationError;
    saveStatus.classList.add("error");
    return;
  }

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

  // Update local cache
  const idx = allEmployees.findIndex((e) => e.id === employeeId);
  if (idx !== -1) allEmployees[idx] = { ...allEmployees[idx], ...updatedData };

  saveStatus.textContent = `Saved ${updatedData.full_name} at ${new Date().toLocaleTimeString()}`;
}

// ---------- DELETE ----------

async function deleteRow(row, employeeId) {
  const name = row.querySelector('[data-field="full_name"]').value;
  openDeleteModal([employeeId], `Remove ${name} from the system?`);
}

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
deleteModal.addEventListener("click", (e) => { if (e.target === deleteModal) closeDeleteModal(); });

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
  const preview =
    names.length <= 4 ? names.join(", ") : `${names.slice(0, 4).join(", ")}, and ${names.length - 4} more`;
  openDeleteModal(Array.from(selectedIds), `Remove ${count} employee${count === 1 ? "" : "s"} (${preview})?`);
});

// ---------- MONTH EDIT PANEL ----------

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

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${month.label}${isFuture ? ' <span class="future-tag">upcoming</span>' : ""}</td>
      <td><input type="number" min="0" step="0.5" class="month-input"
        data-month="${month.key}" data-category="leave"
        value="${leaveRaw !== null && leaveRaw !== undefined ? leaveRaw : ""}"
        placeholder="${isFuture ? "—" : "0"}"
        ${isFuture ? "disabled" : ""}></td>
      <td><input type="number" min="0" step="0.5" class="month-input"
        data-month="${month.key}" data-category="permission"
        value="${permissionRaw !== null && permissionRaw !== undefined ? permissionRaw : ""}"
        placeholder="${isFuture ? "—" : "0"}"
        ${isFuture ? "disabled" : ""}></td>
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
monthEditModal.addEventListener("click", (e) => { if (e.target === monthEditModal) closeMonthEditModal(); });

monthEditSaveBtn.addEventListener("click", async () => {
  if (!monthEditEmployeeId) return;

  const updatedData = {};
  const inputs = monthEditTableBody.querySelectorAll(".month-input:not(:disabled)");
  let monthValidationError = null;

  inputs.forEach((input) => {
    const columnName = `${input.dataset.category}_${input.dataset.month}`;
    const value = input.value.trim();
    if (value === "") {
      updatedData[columnName] = null;
      return;
    }
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) {
      monthValidationError = `"${value}" is not a valid number in ${columnName.replace(/_/g, " ")}.`;
      return;
    }
    updatedData[columnName] = parsed;
  });

  if (monthValidationError) {
    saveStatus.textContent = monthValidationError;
    saveStatus.classList.add("error");
    return;
  }

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

  const idx = allEmployees.findIndex((emp) => emp.id === monthEditEmployeeId);
  if (idx !== -1) allEmployees[idx] = { ...allEmployees[idx], ...updatedData };

  renderTable(allEmployees);
  saveStatus.textContent = "Monthly record saved.";
  closeMonthEditModal();
});

// ---------- ADD NEW EMPLOYEE ----------

document.getElementById("addEmployeeBtn").addEventListener("click", async () => {
  const newEmployee = {
    employee_number: "NEW" + Math.floor(Math.random() * 9000 + 1000),
    full_name: "New Employee",
    department: "",
    date_of_birth: null,
    total_working_days: 0,
    leave_balance: 0,
    pf_number: null,
    esi_number: null,
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
      (emp.full_name || "").toLowerCase().includes(query) ||
      (emp.employee_number || "").toLowerCase().includes(query)
  );
  renderTable(filtered);
});

// ---------- CSV UPLOAD ----------

uploadCsvBtn.addEventListener("click", () => csvFileInput.click());

csvFileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const text = await file.text();
  const { rows, errors: parseErrors } = parseCsv(text);

  csvFileInput.value = "";

  if (rows.length === 0) {
    saveStatus.textContent = "No valid rows found in that CSV.";
    saveStatus.classList.add("error");
    if (parseErrors.length > 0) alert("Issues found:\n\n" + parseErrors.join("\n"));
    return;
  }

  // Only block NEW employees (not in DB yet) that are missing full_name.
  // DOB is no longer required — some employees don't have it.
  const existingNumbers = new Set(allEmployees.map((emp) => emp.employee_number));
  const invalidNewRows = rows.filter(
    (row) => !existingNumbers.has(row.employee_number) && !row.full_name
  );

  if (invalidNewRows.length > 0) {
    const numbers = invalidNewRows.map((r) => r.employee_number).join(", ");
    saveStatus.textContent = "Upload stopped — new employees must have a full_name.";
    saveStatus.classList.add("error");
    alert(`These are new employees but have no full_name in the CSV:\n\n${numbers}\n\nPlease add their names and re-upload.`);
    return;
  }

  saveStatus.textContent = `Uploading ${rows.length} row${rows.length === 1 ? "" : "s"}…`;
  saveStatus.classList.remove("error");

  const { data, error } = await supabaseClient
    .from("employees")
    .upsert(rows, { onConflict: "employee_number" })
    .select();

  if (error) {
    saveStatus.textContent = "Upload failed: " + error.message;
    saveStatus.classList.add("error");
    return;
  }

  await loadAllEmployees();

  let statusMessage = `Uploaded successfully: ${data.length} employee${data.length === 1 ? "" : "s"} added or updated.`;
  if (parseErrors.length > 0) statusMessage += ` (${parseErrors.length} row${parseErrors.length === 1 ? "" : "s"} skipped.)`;
  saveStatus.textContent = statusMessage;
  if (parseErrors.length > 0) alert("Some rows were skipped:\n\n" + parseErrors.join("\n"));
});

// ---------- CSV PARSER ----------
// Accepts your exact CSV format:
//  - Columns in any order (matched by header name)
//  - Date format: M/D/YYYY (Excel default) OR YYYY-MM-DD
//  - Missing permission_dec column: handled automatically
//  - Blank cells: treated as null / not entered
//  - Decimal values: fully supported (0.5, 1.5, 2.5 etc.)
//  - Blank date_of_birth: allowed

function parseCsv(text) {
  // Normalise line endings and remove blank lines
  const allLines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines = allLines.filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return { rows: [], errors: ["File has no data rows below the header."] };
  }

  const monthlyColumns = [];
  MONTHS.forEach((month) => {
    monthlyColumns.push(`leave_${month.key}`, `permission_${month.key}`);
  });

  const allRecognizedColumns = [
    "employee_number", "date_of_birth", "full_name", "department",
    "total_working_days", "leave_balance", "pf_number", "esi_number",
    ...monthlyColumns,
  ];

  // Parse and clean the header row
  // Also strips BOM character (\uFEFF) that Excel sometimes adds at the very start
  let header = lines[0]
    .replace(/^\uFEFF/, "")
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/\r/g, ""));

  // FIX: Your CSV ends at leave_dec (31 columns) — permission_dec is missing.
  // We add it to the header so column counts match without any row edits needed.
  const hasMissingPermissionDec =
    !header.includes("permission_dec") && header.includes("leave_dec");
  if (hasMissingPermissionDec) {
    header.push("permission_dec");
  }

  const rows = [];
  const errors = [];

  const unrecognized = header.filter((col) => !allRecognizedColumns.includes(col));
  if (unrecognized.length > 0) {
    errors.push(`Note: unrecognized column(s) ignored: ${unrecognized.join(", ")}.`);
  }

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = lines[i];

    // Split on commas — this simple split works for your format since
    // none of your values contain commas. For CSVs with quoted commas
    // inside values, a full parser would be needed, but yours doesn't.
    const values = rawLine.split(",").map((v) => v.trim().replace(/\r/g, ""));

    // FIX: If we added permission_dec to the header, the data rows
    // are naturally short by one. Pad them instead of erroring.
    if (hasMissingPermissionDec && values.length === header.length - 1) {
      values.push(""); // add the missing blank permission_dec value
    }

    if (values.length !== header.length) {
      errors.push(
        `Line ${lineNumber}: expected ${header.length} columns, found ${values.length}. Row skipped.`
      );
      continue;
    }

    // Build rawRow object keyed by column name
    const rawRow = {};
    header.forEach((colName, idx) => {
      rawRow[colName] = values[idx];
    });

    if (!rawRow.employee_number || rawRow.employee_number.trim() === "") {
      errors.push(`Line ${lineNumber}: employee_number is empty. Row skipped.`);
      continue;
    }

    // ---------- DATE OF BIRTH ----------
    // Accepts: YYYY-MM-DD, M/D/YYYY, MM/DD/YYYY, or blank
    if ("date_of_birth" in rawRow) {
      const dob = rawRow.date_of_birth.trim();
      if (dob === "" || dob === "-") {
        rawRow.date_of_birth = null; // blank DOB — allowed
      } else {
        const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
        const usPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        if (isoPattern.test(dob)) {
          // Already correct — keep as-is
        } else if (usPattern.test(dob)) {
          const parts = dob.split("/");
          rawRow.date_of_birth = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
        } else {
          errors.push(
            `Line ${lineNumber} (${rawRow.employee_number}): date_of_birth "${dob}" not recognised. Use YYYY-MM-DD or M/D/YYYY. Row skipped.`
          );
          continue;
        }
      }
    }

    // ---------- NUMERIC COLUMNS ----------
    // All leave/permission/working_days/leave_balance columns.
    // Blank or "-" → null. Real number (including decimals) → kept.
    const numericColumns = ["total_working_days", "leave_balance", ...monthlyColumns];
    const numericValues = {};
    let hasNumericError = false;

    numericColumns.forEach((col) => {
      if (!(col in rawRow)) return; // column not in this CSV — leave DB value untouched

      const cellText = rawRow[col].trim();
      if (cellText === "" || cellText === "-") {
        numericValues[col] = null;
        return;
      }

      const num = parseFloat(cellText); // parseFloat handles 0.5, 1.5, 2.5 etc.
      if (Number.isNaN(num)) {
        errors.push(
          `Line ${lineNumber} (${rawRow.employee_number}): "${col}" value "${cellText}" is not a number. Row skipped.`
        );
        hasNumericError = true;
      } else {
        numericValues[col] = num;
      }
    });

    if (hasNumericError) continue;

    // ---------- BUILD FINAL ROW ----------
    // Only include fields actually present in the CSV — this lets a
    // "monthly update only" CSV skip full_name/DOB/etc without
    // overwriting those fields in the database with blanks.
    const finalRow = { employee_number: rawRow.employee_number.trim() };

    if ("date_of_birth" in rawRow && rawRow.date_of_birth !== null) {
      finalRow.date_of_birth = rawRow.date_of_birth;
    }
    if ("full_name" in rawRow && rawRow.full_name.trim()) {
      finalRow.full_name = rawRow.full_name.trim();
    }
    if ("department" in rawRow) finalRow.department = rawRow.department.trim() || null;
    if ("pf_number" in rawRow) finalRow.pf_number = rawRow.pf_number.trim() || null;
    if ("esi_number" in rawRow) finalRow.esi_number = rawRow.esi_number.trim() || null;

    numericColumns.forEach((col) => {
      if (col in numericValues) finalRow[col] = numericValues[col];
    });

    finalRow.last_updated = new Date().toISOString();
    rows.push(finalRow);
  }

  return { rows, errors };
}

// ---------- AUTO-LOGOUT (1 minute inactivity) ----------

const ADMIN_TIMEOUT_SECONDS = 60;
let adminSecondsRemaining = ADMIN_TIMEOUT_SECONDS;
let adminCountdownInterval = null;

const adminWarningBanner = document.createElement("div");
adminWarningBanner.style.cssText = `
  display:none; position:fixed; bottom:20px; left:50%;
  transform:translateX(-50%); background:#b3432f; color:#fff;
  padding:12px 24px; border-radius:8px; font-size:0.9rem;
  font-weight:600; z-index:200; box-shadow:0 4px 12px rgba(0,0,0,0.2);
  white-space:nowrap;
`;
document.body.appendChild(adminWarningBanner);

function resetAdminTimer() {
  adminSecondsRemaining = ADMIN_TIMEOUT_SECONDS;
  adminWarningBanner.style.display = "none";
}

function startAdminCountdown() {
  if (adminCountdownInterval) return; // prevent duplicate intervals
  adminCountdownInterval = setInterval(() => {
    adminSecondsRemaining -= 1;
    if (adminSecondsRemaining <= 10 && adminSecondsRemaining > 0) {
      adminWarningBanner.style.display = "block";
      const panelOpen = !monthEditModal.classList.contains("hidden");
      adminWarningBanner.textContent =
        `Signing out in ${adminSecondsRemaining}s due to inactivity.${panelOpen ? " Unsaved month changes will be lost." : ""}`;
    }
    if (adminSecondsRemaining <= 0) {
      clearInterval(adminCountdownInterval);
      adminCountdownInterval = null;
      supabaseClient.auth.signOut().then(() => { window.location.href = "admin.html"; });
    }
  }, 1000);
}

["mousemove", "mousedown", "keydown", "touchstart", "scroll"].forEach(
  (evt) => document.addEventListener(evt, resetAdminTimer)
);

// Start countdown as soon as the admin panel becomes visible
const panelObserver = new MutationObserver(() => {
  if (!adminPanelView.classList.contains("hidden")) startAdminCountdown();
});
panelObserver.observe(adminPanelView, { attributes: true, attributeFilter: ["class"] });

// ---------- INITIALIZE ----------
checkExistingSession();
