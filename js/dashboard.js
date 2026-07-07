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
  sessionStorage.removeItem("loggedInEmployee");
  window.location.href = "index.html";
});

// ============================================================
// AUTO-LOGOUT AFTER 1.5 MINUTES OF INACTIVITY
// ============================================================
// How this works:
//   - A 90-second countdown starts as soon as the dashboard loads.
//   - Any mouse movement, click, keypress, or screen touch resets
//     the countdown back to 90 seconds — so someone actively
//     reading their dashboard won't be interrupted mid-way.
//   - If 90 full seconds pass with zero activity, the session is
//     cleared and the employee is sent back to the login page.
//   - A visible countdown appears in the last 10 seconds so the
//     employee isn't surprised by a sudden redirect.
// ============================================================

const TIMEOUT_SECONDS = 90;
let secondsRemaining = TIMEOUT_SECONDS;
let countdownInterval = null;

// Create and inject the countdown warning banner into the page.
// It stays hidden until the last 10 seconds, then becomes visible.
const warningBanner = document.createElement("div");
warningBanner.id = "autoLogoutWarning";
warningBanner.style.cssText = `
  display: none;
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #b3432f;
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
`;
document.body.appendChild(warningBanner);

function resetTimer() {
  secondsRemaining = TIMEOUT_SECONDS;
  warningBanner.style.display = "none";
}

function startCountdown() {
  countdownInterval = setInterval(() => {
    secondsRemaining -= 1;

    if (secondsRemaining <= 10 && secondsRemaining > 0) {
      // Show the warning banner in the last 10 seconds.
      warningBanner.style.display = "block";
      warningBanner.textContent =
        `You will be signed out in ${secondsRemaining} second${secondsRemaining === 1 ? "" : "s"} due to inactivity.`;
    }

    if (secondsRemaining <= 0) {
      // Time's up — clear the interval so it doesn't keep firing,
      // then clear the session and redirect exactly the same way
      // the manual logout button does.
      clearInterval(countdownInterval);
      sessionStorage.removeItem("loggedInEmployee");
      window.location.href = "index.html";
    }
  }, 1000);
}

// Reset the timer on any of these events — covers mouse, keyboard,
// and touchscreen (mobile) activity in one list.
["mousemove", "mousedown", "keydown", "touchstart", "scroll"].forEach(
  (eventName) => document.addEventListener(eventName, resetTimer)
);

startCountdown();
loadDashboard();