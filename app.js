// ===============================
// synTAX Accounting System Script
// ===============================

// ---------- GLOBAL VARIABLES ----------
let journalEntries = JSON.parse(localStorage.getItem("journalEntries")) || [];
let accounts = JSON.parse(localStorage.getItem("accounts")) || [];
let contacts = JSON.parse(localStorage.getItem("contacts")) || [];

let undoStack = [];
let redoStack = [];

// ---------- SIDEBAR NAVIGATION ----------
document.querySelectorAll(".sidebar li").forEach(li => {
  li.addEventListener("click", () => {
    document.querySelectorAll(".sidebar li").forEach(i => i.classList.remove("active"));
    li.classList.add("active");
    const section = li.dataset.section;

    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(section).classList.add("active");
  });
});

// ---------- SAVE TO LOCAL STORAGE ----------
function saveData() {
  localStorage.setItem("journalEntries", JSON.stringify(journalEntries));
  localStorage.setItem("accounts", JSON.stringify(accounts));
  localStorage.setItem("contacts", JSON.stringify(contacts));
}

// ---------- FORM HELPERS ----------
function clearForm(form) {
  form.reset();
}

// ==========================================
//        CHART OF ACCOUNTS SECTION
// ==========================================
const accountForm = document.getElementById("accountForm");
const accountsTable = document.getElementById("accountsTable")?.querySelector("tbody");

if (accountForm) {
  accountForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("accName").value.trim();
    const type = document.getElementById("accType").value;

    if (!name) return alert("Please enter an account name.");

    const codePrefix = {
      Asset: "1000",
      Liability: "2000",
      Equity: "3000",
      Revenue: "4000",
      Expense: "5000"
    }[type];

    const code = `${codePrefix}-${accounts.length + 1}`;
    accounts.push({ code, name, type });

    saveData();
    renderAccounts();
    clearForm(accountForm);
  });
}

function renderAccounts() {
  if (!accountsTable) return;
  accountsTable.innerHTML = "";

  accounts.forEach((acc, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${acc.code}</td>
      <td>${acc.name}</td>
      <td>${acc.type}</td>
      <td>
        <button onclick="deleteAccount(${i})">🗑️</button>
      </td>`;
    accountsTable.appendChild(tr);
  });
}

function deleteAccount(i) {
  if (confirm("Delete this account?")) {
    accounts.splice(i, 1);
    saveData();
    renderAccounts();
  }
}

// ==========================================
//        JOURNAL ENTRIES SECTION
// ==========================================
const journalForm = document.getElementById("journalForm");
const journalTable = document.getElementById("journalTable")?.querySelector("tbody");

if (journalForm) {
  journalForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const entry = {
      date: document.getElementById("jDate").value,
      desc: document.getElementById("jDesc").value.trim(),
      debit: document.getElementById("jDebit").value.trim(),
      credit: document.getElementById("jCredit").value.trim(),
      amount: parseFloat(document.getElementById("jAmount").value),
    };

    if (!entry.date || !entry.desc || !entry.debit || !entry.credit || !entry.amount) {
      return alert("Please fill out all fields.");
    }

    journalEntries.push(entry);
    undoStack.push([...journalEntries]);
    redoStack = [];

    saveData();
    renderJournal();
    renderLedger();
    updateDashboard();
    clearForm(journalForm);
  });
}

function renderJournal() {
  if (!journalTable) return;
  journalTable.innerHTML = "";

  journalEntries.forEach((entry, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.desc}</td>
      <td>${entry.debit}</td>
      <td>${entry.credit}</td>
      <td>₱${entry.amount.toLocaleString()}</td>
      <td>
        <button onclick="deleteJournal(${index})">🗑️</button>
      </td>`;
    journalTable.appendChild(tr);
  });
}

function deleteJournal(index) {
  if (confirm("Delete this journal entry?")) {
    journalEntries.splice(index, 1);
    undoStack.push([...journalEntries]);
    redoStack = [];
    saveData();
    renderJournal();
    renderLedger();
    updateDashboard();
  }
}

// ---------- Undo / Redo ----------
document.getElementById("undoBtn")?.addEventListener("click", () => {
  if (undoStack.length > 0) {
    redoStack.push([...journalEntries]);
    journalEntries = undoStack.pop();
    saveData();
    renderJournal();
    renderLedger();
    updateDashboard();
  }
});

document.getElementById("redoBtn")?.addEventListener("click", () => {
  if (redoStack.length > 0) {
    undoStack.push([...journalEntries]);
    journalEntries = redoStack.pop();
    saveData();
    renderJournal();
    renderLedger();
    updateDashboard();
  }
});

// ==========================================
//              LEDGER SECTION
// ==========================================
function renderLedger() {
  const ledgerDiv = document.getElementById("generalLedger");
  if (!ledgerDiv) return;

  if (journalEntries.length === 0) {
    ledgerDiv.innerHTML = "<p>No ledger entries yet.</p>";
    return;
  }

  const ledger = {};

  journalEntries.forEach(e => {
    ledger[e.debit] = (ledger[e.debit] || 0) + e.amount;
    ledger[e.credit] = (ledger[e.credit] || 0) - e.amount;
  });

  ledgerDiv.innerHTML = `
    <table>
      <thead><tr><th>Account</th><th>Balance</th></tr></thead>
      <tbody>
        ${Object.entries(ledger)
          .map(([acc, bal]) => `<tr><td>${acc}</td><td>₱${bal.toLocaleString()}</td></tr>`)
          .join("")}
      </tbody>
    </table>`;
}

// ==========================================
//           DASHBOARD & CHARTS
// ==========================================
function updateDashboard() {
  let income = 0, expenses = 0;

  journalEntries.forEach(e => {
    if (e.debit.toLowerCase().includes("expense")) expenses += e.amount;
    if (e.credit.toLowerCase().includes("revenue") || e.credit.toLowerCase().includes("income")) income += e.amount;
  });

  const cashBalance = income - expenses;
  const profit = income - expenses;

  document.getElementById("cashBalance").textContent = `₱${cashBalance.toLocaleString()}`;
  document.getElementById("totalIncome").textContent = `₱${income.toLocaleString()}`;
  document.getElementById("totalExpenses").textContent = `₱${expenses.toLocaleString()}`;
  document.getElementById("netProfit").textContent = `₱${profit.toLocaleString()}`;

  renderCharts(income, expenses);
}

function renderCharts(income, expenses) {
  const ctx1 = document.getElementById("cashFlowChart");
  const ctx2 = document.getElementById("incomeExpenseChart");

  if (ctx1) {
    new Chart(ctx1, {
      type: "bar",
      data: {
        labels: ["Inflows", "Outflows"],
        datasets: [{
          label: "Cash Flow",
          data: [income, expenses],
          backgroundColor: ["#0077b6", "#d90429"]
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }

  if (ctx2) {
    new Chart(ctx2, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [{
          label: "Income",
          borderColor: "#0077b6",
          data: [income / 3, income / 2, income],
          fill: false
        }, {
          label: "Expenses",
          borderColor: "#d90429",
          data: [expenses / 3, expenses / 2, expenses],
          fill: false
        }]
      },
      options: { responsive: true }
    });
  }
}

// ==========================================
//           CONTACTS SECTION
// ==========================================
const contactForm = document.getElementById("contactForm");
const contactTable = document.getElementById("contactTable")?.querySelector("tbody");

if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const contact = {
      name: document.getElementById("cName").value,
      type: document.getElementById("cType").value,
      email: document.getElementById("cEmail").value
    };

    contacts.push(contact);
    saveData();
    renderContacts();
    clearForm(contactForm);
  });
}

function renderContacts() {
  if (!contactTable) return;
  contactTable.innerHTML = "";

  contacts.forEach((c, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>${c.type}</td>
      <td>${c.email}</td>`;
    contactTable.appendChild(tr);
  });
}

// ==========================================
//            SETTINGS SECTION
// ==========================================
function backupData() {
  const data = {
    journalEntries,
    accounts,
    contacts
  };
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "syntax_backup.json";
  a.click();
}

function restoreData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = JSON.parse(event.target.result);
      journalEntries = data.journalEntries || [];
      accounts = data.accounts || [];
      contacts = data.contacts || [];
      saveData();
      renderAll();
    };
    reader.readAsText(file);
  };
  input.click();
}

// ---------- THEME TOGGLE ----------
document.getElementById("themeSwitch")?.addEventListener("change", (e) => {
  document.body.classList.toggle("dark-theme", e.target.checked);
});

// ==========================================
//             INITIAL LOAD
// ==========================================
function renderAll() {
  renderAccounts();
  renderJournal();
  renderLedger();
  renderContacts();
  updateDashboard();
}

document.addEventListener("DOMContentLoaded", renderAll);

// ===== DARK MODE TOGGLE =====
const themeToggle = document.getElementById("toggleTheme");
const body = document.body;

// Load saved theme
if (localStorage.getItem("theme") === "dark") {
  body.classList.add("dark-mode");
  themeToggle.textContent = "☀️ Light Mode";
}

themeToggle.addEventListener("click", () => {
  body.classList.toggle("dark-mode");
  const isDark = body.classList.contains("dark-mode");
  themeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
  localStorage.setItem("theme", isDark ? "dark" : "light");
});
