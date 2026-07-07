// ============================================================
// LOGIN PAGE LOGIC (index.html)
// ============================================================
// What this file does, in plain terms:
//   1. Waits for the employee to submit the login form.
//   2. Takes whatever they typed (employee number + DOB).
//   3. Asks the database: "is there a row where BOTH of these match?"
//   4. If yes → remember which employee this is, go to dashboard.
//   5. If no → show an error, let them try again.
// ============================================================

const loginForm = document.getElementById("loginForm");
const errorMsg = document.getElementById("errorMsg");
const loginBtn = document.getElementById("loginBtn");
const dobDay = document.getElementById("dobDay");
const dobYear = document.getElementById("dobYear");

// Fill the Day dropdown: 01 through 31.
for (let d = 1; d <= 31; d++) {
  const value = String(d).padStart(2, "0"); // turns 1 into "01", 9 into "09", etc.
  dobDay.insertAdjacentHTML("beforeend", `<option value="${value}">${d}</option>`);
}

// Fill the Year dropdown: current year down to 100 years ago, newest first
// (so a typical adult employee doesn't have to scroll far to find their year).
const currentYear = new Date().getFullYear();
for (let y = currentYear; y >= currentYear - 100; y--) {
  dobYear.insertAdjacentHTML("beforeend", `<option value="${y}">${y}</option>`);
}

loginForm.addEventListener("submit", async (event) => {
  // Stops the browser's default behavior of reloading the page
  // on form submit — we want to handle this with JavaScript instead.
  event.preventDefault();

  const empNumber = document.getElementById("empNumber").value.trim();

  // Combine the three separate dropdowns into the single format the
  // database expects: YYYY-MM-DD. This is the one place format
  // ambiguity gets resolved — the employee never has to think about
  // which order to type numbers in, they just pick Day, Month, Year
  // from clearly labeled lists, and we assemble the right string here.
  const day = document.getElementById("dobDay").value;
  const month = document.getElementById("dobMonth").value;
  const year = document.getElementById("dobYear").value;
  const empDob = `${year}-${month}-${day}`;

  errorMsg.textContent = "";
  loginBtn.disabled = true;
  loginBtn.textContent = "Checking…";

  // This is the actual "ask the database" step.
  // .from("employees")     → look in the employees table
  // .select("*")           → get all columns for matching rows
  // .eq("employee_number", empNumber)  → where employee_number equals what they typed
  // .eq("date_of_birth", empDob)       → AND date_of_birth equals what they typed
  // .single()               → we expect exactly one matching row (employee numbers are unique)
  const { data, error } = await supabaseClient
    .from("employees")
    .select("*")
    .eq("employee_number", empNumber)
    .eq("date_of_birth", empDob)
    .single();

  loginBtn.disabled = false;
  loginBtn.textContent = "Sign In";

  if (error || !data) {
    // Deliberately vague error message — we don't say WHICH field
    // was wrong, so we're not handing out hints about which employee
    // numbers are valid to someone guessing.
    errorMsg.textContent = "Employee number or date of birth is incorrect.";
    return;
  }

  // Login succeeded. We store the employee's own data in
  // sessionStorage — this lives only in this browser tab, and is
  // automatically cleared when the tab is closed. This is what lets
  // dashboard.html know who's logged in without asking the database
  // again immediately, and without ever putting sensitive data in
  // the page URL.
  sessionStorage.setItem("loggedInEmployee", JSON.stringify(data));

  // Send them to their dashboard.
  window.location.href = "dashboard.html";
});
