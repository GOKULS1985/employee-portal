// ============================================================
// SHARED MONTH-TRACKING UTILITIES
// ============================================================
// This file is loaded by dashboard.html and admin.html (NOT
// index.html — the login page doesn't need any of this). It
// exists so the rule for "how do we treat a missing month's
// number" is written ONCE and used identically everywhere,
// rather than three separate copies of similar logic slowly
// drifting apart across dashboard.js, admin.js, and the CSV
// parser as the project gets edited over time.
//
// THE CORE RULE, explained:
// Every month/category cell in the database can be in one of
// three real states:
//   1. NULL (nothing entered) AND the month is in the future
//      → shown as "—" (a dash). Nobody can know June's leave
//        count in March; it hasn't happened yet.
//   2. NULL (nothing entered) AND the month has already passed
//      → treated as 0, exactly as instructed. This is the
//        "if the column is empty, consider it 0" rule — but
//        ONLY applies once the month has actually occurred.
//   3. An actual number (0, 1, 2, etc.) was entered
//      → shown exactly as entered, including a genuine 0.
// Cases 2 and 3 deliberately look the same once a month has
// passed (both end up as the number 0) — that's intentional and
// matches exactly what was asked for. Only case 1 (the future)
// is treated differently, since "hasn't happened yet" is a
// different real situation from "happened, value is zero."
// ============================================================

// Ordered list of months, matching the database column suffixes
// (leave_jan, permission_jan, leave_feb, ...). Order matters here
// — it's used to build tables in calendar order.
const MONTHS = [
  { key: "jan", label: "January" },
  { key: "feb", label: "February" },
  { key: "mar", label: "March" },
  { key: "apr", label: "April" },
  { key: "may", label: "May" },
  { key: "jun", label: "June" },
  { key: "jul", label: "July" },
  { key: "aug", label: "August" },
  { key: "sep", label: "September" },
  { key: "oct", label: "October" },
  { key: "nov", label: "November" },
  { key: "dec", label: "December" },
];

// Returns true if the given month (1-12) of the CURRENT year is
// still in the future relative to today's real date. Only ever
// compares against the current year — this system doesn't track
// historical past years, only the running current-year record.
function isMonthInFuture(monthNumber) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // JS months are 0-indexed (Jan = 0), so +1 to match our 1-12 scheme
  return monthNumber > currentMonth;
}

// Given a raw value straight from the database (which may be an
// actual number, or null/undefined if nothing was ever entered)
// and that month's 1-12 position, returns exactly what should be
// DISPLAYED to a person: either the dash symbol, or a real number
// (defaulting unset-but-past months to 0).
function resolveDisplayValue(rawValue, monthNumber) {
  const hasRealValue = rawValue !== null && rawValue !== undefined;

  if (hasRealValue) return rawValue; // case 3: real entered number, shown as-is

  if (isMonthInFuture(monthNumber)) return "—"; // case 1: future, nothing to show yet

  return 0; // case 2: past/current month, nothing entered, treated as 0
}

// Given a raw value straight from the database, returns the NUMBER
// that should be used in any sum/calculation (running totals, leave
// balance remaining, etc). This is subtly different from
// resolveDisplayValue above: a calculation needs an actual number
// to add, even for future months — but future months correctly
// contribute 0 to a running total, since 0 occurrences have
// happened there yet, which is mathematically accurate either way.
function resolveCalculationValue(rawValue) {
  const hasRealValue = rawValue !== null && rawValue !== undefined;
  return hasRealValue ? rawValue : 0;
}

// Given a full employee database row, calculates the running
// year-to-date totals for leave and permission by summing all 12
// months using resolveCalculationValue. Used by both the employee
// dashboard (to show "Total Number of Leave: 7") and the admin
// table (so HR sees the same totals an employee would see).
function calculateYearTotals(employeeRow) {
  let totalLeave = 0;
  let totalPermission = 0;

  MONTHS.forEach((month, index) => {
    const monthNumber = index + 1;
    totalLeave += resolveCalculationValue(employeeRow[`leave_${month.key}`]);
    totalPermission += resolveCalculationValue(employeeRow[`permission_${month.key}`]);
  });

  return { totalLeave, totalPermission };
}
