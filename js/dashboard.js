// ============================================================
// EMPLOYEE DASHBOARD LOGIC (dashboard.html)
// ============================================================
// What this file does:
//   1. Checks sessionStorage for the data login.js stored.
//   2. If nothing's there → this person never logged in → send
//      them back to the login page.
//   3. If data IS there → re-fetch that employee's row fresh from
//      the database (so they always see today's numbers, not
//      whatever was true at the exact moment they logged in —
//      important since HR may update records during the day).
//   4. Fill the page with that data.
// ============================================================

const loadingState = document.getElementById("loadingState");
const dashboardContent = document.getElementById("dashboardContent");
const errorState = document.getElementById("errorState");

async function loadDashboard() {
  const stored = sessionStorage.getItem("loggedInEmployee");

  if (!stored) {
    // No login session found — bounce back to login.
    window.location.href = "index.html";
    return;
  }

  const sessionEmployee = JSON.parse(stored);

  // Re-fetch fresh data using the employee's unique ID, rather than
  // trusting the (possibly hours-old) data sitting in sessionStorage.
  const { data, error } = await supabaseClient
    .from("employees")
    .select("*")
    .eq("id", sessionEmployee.id)
    .single();

  loadingState.classList.add("hidden");

  if (error || !data) {
    errorState.classList.remove("hidden");
    return;
  }

  // Fill in the page with this employee's data.
  document.getElementById("empName").textContent = data.full_name;
  document.getElementById("empMeta").textContent =
    `${data.employee_number} · ${data.department || "—"}`;

  // totalLeave / totalPermission are CALCULATED here by adding up
  // all 12 months (via the shared month-utils.js helper), rather
  // than read from a single stored column — this is what keeps the
  // top stat cards and the table below always in agreement, since
  // they're both built from the exact same 24 monthly values.
  const { totalLeave, totalPermission } = calculateYearTotals(data);

  document.getElementById("statWorkingDays").textContent = data.total_working_days;
  document.getElementById("statLeaves").textContent = totalLeave;
  document.getElementById("statPermissions").textContent = totalPermission;
  document.getElementById("statBalance").textContent = data.leave_balance;

  // Build the month-by-month table: one row per month, each cell
  // resolved through resolveDisplayValue so future months correctly
  // show "—" while past/current months with nothing entered show 0.
  const monthTableBody = document.getElementById("monthTableBody");
  monthTableBody.innerHTML = "";

  MONTHS.forEach((month, index) => {
    const monthNumber = index + 1;
    const leaveValue = resolveDisplayValue(data[`leave_${month.key}`], monthNumber);
    const permissionValue = resolveDisplayValue(data[`permission_${month.key}`], monthNumber);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${month.label}</td>
      <td>${leaveValue}</td>
      <td>${permissionValue}</td>
    `;
    monthTableBody.appendChild(row);
  });

  document.getElementById("footerTotalLeave").textContent = totalLeave;
  document.getElementById("footerTotalPermission").textContent = totalPermission;

  const updated = new Date(data.last_updated);
  document.getElementById("lastUpdated").textContent =
    "Last updated: " + updated.toLocaleString();

  dashboardContent.classList.remove("hidden");
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  // Clears the stored session — next visit to dashboard.html will
  // correctly bounce back to login, since loadDashboard() checks
  // for this first.
  sessionStorage.removeItem("loggedInEmployee");
  window.location.href = "index.html";
});

loadDashboard();
